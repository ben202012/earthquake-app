#!/usr/bin/env python3
"""
壊れた jma-tsunami-areas.topojson を正しい GeoJSON に変換する。

既存ファイルの問題:
  - arcs の座標が TopoJSON 仕様 (差分エンコード) ではなく
    絶対値×1000 の整数として格納されている。
  - そのため topojson.min.js は `topojson.feature()` 呼び出し時に例外。

このスクリプトは生の値を scale=0.001 で復元し、
MultiPolygon の GeoJSON Feature Collection として出力する。
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "jma-tsunami-areas.topojson"
DST = ROOT / "data" / "jma-tsunami-areas.geojson"


def decode_arc(raw_points: list[list[int]], scale_x: float, scale_y: float) -> list[list[float]]:
    """raw_points の各 [x, y] 整数を scale 倍して実座標に変換する(絶対値仮説)。"""
    return [[p[0] * scale_x, p[1] * scale_y] for p in raw_points]


def close_ring(ring: list[list[float]]) -> list[list[float]]:
    """リングの最初と最後の点が一致しない場合、末尾に最初の点を追加する。"""
    if ring and ring[0] != ring[-1]:
        ring = ring + [ring[0]]
    return ring


def resolve_arcs_ref(arc_refs, arcs: list, scale_x: float, scale_y: float) -> list[list[float]]:
    """TopoJSON の arc 参照(整数 index、負数で反転)を実座標リングに解決する。

    参照先が配列範囲外の場合は IndexError を投げ、呼び出し側でスキップさせる。
    """
    coords: list[list[float]] = []
    for idx in arc_refs:
        real = ~idx if idx < 0 else idx
        if real >= len(arcs):
            raise IndexError(f"arc index {idx} out of range (arcs={len(arcs)})")
        raw = arcs[real]
        points = decode_arc(raw, scale_x, scale_y)
        if idx < 0:
            points = list(reversed(points))
        if coords and points and coords[-1] == points[0]:
            points = points[1:]
        coords.extend(points)
    return close_ring(coords)


def build_multipolygon(arcs_ref, arcs: list, scale_x: float, scale_y: float):
    """MultiPolygon 用の arcs 3 段ネストを GeoJSON coordinates に変換する。"""
    polys = []
    for polygon_arcs in arcs_ref:
        rings = []
        for ring_arcs in polygon_arcs:
            rings.append(resolve_arcs_ref(ring_arcs, arcs, scale_x, scale_y))
        polys.append(rings)
    return polys


def build_polygon(arcs_ref, arcs: list, scale_x: float, scale_y: float):
    """Polygon 用の arcs 2 段ネストを GeoJSON coordinates に変換する。"""
    rings = []
    for ring_arcs in arcs_ref:
        rings.append(resolve_arcs_ref(ring_arcs, arcs, scale_x, scale_y))
    return rings


def convert() -> dict:
    topo = json.loads(SRC.read_text(encoding="utf-8"))

    transform = topo.get("transform") or {}
    scale_x, scale_y = transform.get("scale", [1.0, 1.0])

    obj_name = next(iter(topo["objects"]))
    geometries = topo["objects"][obj_name]["geometries"]
    arcs = topo["arcs"]

    features = []
    skipped: list[str] = []
    for g in geometries:
        gtype = g.get("type")
        props = g.get("properties") or {}
        arcs_ref = g.get("arcs")
        try:
            if gtype == "MultiPolygon":
                coords = build_multipolygon(arcs_ref, arcs, scale_x, scale_y)
            elif gtype == "Polygon":
                coords = build_polygon(arcs_ref, arcs, scale_x, scale_y)
            else:
                skipped.append(f"{props.get('AREA_NAME', '?')} (type={gtype})")
                continue
        except IndexError as e:
            skipped.append(f"{props.get('AREA_NAME', '?')} ({e})")
            continue

        features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": {"type": gtype, "coordinates": coords},
            }
        )

    if skipped:
        print(f"  ⚠️ スキップ {len(skipped)}件: {', '.join(skipped)}")

    return {"type": "FeatureCollection", "features": features}


def main() -> None:
    print(f"[読込] {SRC}")
    geojson = convert()
    DST.write_text(json.dumps(geojson, ensure_ascii=False), encoding="utf-8")
    print(f"[書出] {DST} ({len(geojson['features'])} features)")

    # サンプル出力
    for f in geojson["features"][:3]:
        name = f["properties"].get("AREA_NAME")
        coords = f["geometry"]["coordinates"]
        # MultiPolygon → 最初のポリゴンの最初のリング
        first_ring = coords[0][0]
        lons = [p[0] for p in first_ring]
        lats = [p[1] for p in first_ring]
        print(
            f"  {name}: "
            f"lon {min(lons):.2f}〜{max(lons):.2f}, "
            f"lat {min(lats):.2f}〜{max(lats):.2f}, "
            f"points={len(first_ring)}"
        )


if __name__ == "__main__":
    main()
