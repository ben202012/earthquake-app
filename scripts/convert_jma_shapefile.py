#!/usr/bin/env python3
"""
気象庁公式 津波予報区シェープファイル → GeoJSON 変換スクリプト

ソース: https://www.data.jma.go.jp/developer/gis/20240520_AreaTsunami_GIS.zip
  - zip 解凍後の AreaTsunami.shp (原名: 津波予報区.shp)
  - 70 地域分の POLYLINE (海岸線アーク)
  - 座標系: WGS84 (EPSG:4326) を前提

出力: data/jma-tsunami-areas.geojson
  - MultiLineString 形式(TV 表示の「沿岸沿いの太い線」用)
  - shapely.simplify で頂点を 1/50 程度まで削減(ブラウザ負荷軽減)
  - STATUS='advisory' を全エリアに付与(デフォルトは注意報扱い)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import shapefile  # pyshp
from shapely.geometry import MultiLineString, shape as shapely_shape


def build_multilinestring(shape: shapefile.Shape) -> MultiLineString:
    """pyshp の POLYLINE を shapely.MultiLineString に変換する。"""
    lines: list[list[tuple[float, float]]] = []
    parts = list(shape.parts) + [len(shape.points)]
    for i in range(len(parts) - 1):
        segment = shape.points[parts[i] : parts[i + 1]]
        if len(segment) >= 2:
            lines.append([(x, y) for x, y in segment])
    return MultiLineString(lines)


def convert(src_shp: Path, dst_geojson: Path, tolerance: float) -> None:
    reader = shapefile.Reader(str(src_shp))
    fields = [f[0] for f in reader.fields[1:]]

    features: list[dict] = []
    orig_pts_total = 0
    simp_pts_total = 0

    for shape_rec in reader.iterShapeRecords():
        shp = shape_rec.shape
        rec = shape_rec.record
        if not shp.points:
            continue

        raw = build_multilinestring(shp)
        orig_pts = sum(len(line.coords) for line in raw.geoms)
        simplified = raw.simplify(tolerance, preserve_topology=False)
        # simplify の結果が LineString になる場合もあるので統一
        if simplified.is_empty:
            continue
        if simplified.geom_type == "LineString":
            coords = [list(map(list, simplified.coords))]
        else:
            coords = [list(map(list, ls.coords)) for ls in simplified.geoms]
        simp_pts = sum(len(c) for c in coords)

        orig_pts_total += orig_pts
        simp_pts_total += simp_pts

        props = {f: rec[f] for f in fields}
        props["AREA_CODE"] = str(props.pop("code", "")).strip()
        props["AREA_NAME"] = str(props.pop("name", "")).strip()
        props["AREA_NAME_KANA"] = str(props.pop("namekana", "")).strip()
        props["STATUS"] = "none"  # 平常時: 警報なし。XML/WebSocket 受信時または simulateTsunamiAlerts() で上書きされる

        features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": {"type": "MultiLineString", "coordinates": coords},
            }
        )

    geojson = {"type": "FeatureCollection", "features": features}
    dst_geojson.write_text(json.dumps(geojson, ensure_ascii=False), encoding="utf-8")

    size_mb = dst_geojson.stat().st_size / 1024 / 1024
    print(f"[書出] {dst_geojson}")
    print(f"  features: {len(features)}")
    print(f"  頂点数: {orig_pts_total:,} → {simp_pts_total:,} "
          f"({simp_pts_total / max(orig_pts_total, 1) * 100:.1f}%)")
    print(f"  ファイルサイズ: {size_mb:.2f} MB")
    print(f"  tolerance: {tolerance} 度")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--src", default="/tmp/jma-tsunami-shp/AreaTsunami",
                   help="シェープファイルのパス(拡張子なし)")
    p.add_argument("--dst", default=None, help="GeoJSON 出力先(省略時は data/jma-tsunami-areas.geojson)")
    p.add_argument("--tolerance", type=float, default=0.002,
                   help="simplify の許容度(度。0.002≒約200m)")
    args = p.parse_args()

    src = Path(args.src)
    if not Path(str(src) + ".shp").exists():
        print(f"❌ {src}.shp が見つかりません", file=sys.stderr)
        sys.exit(1)

    if args.dst:
        dst = Path(args.dst)
    else:
        dst = Path(__file__).resolve().parent.parent / "data" / "jma-tsunami-areas.geojson"

    convert(src, dst, args.tolerance)


if __name__ == "__main__":
    main()
