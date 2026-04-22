#!/usr/bin/env bash
# 地震・津波情報表示システム ワンタッチ起動
# Finder からダブルクリックすると Terminal が開いてサーバーが起動します

# このスクリプト自身のディレクトリに cd
cd "$(dirname "$0")"

# 既存の start.sh を実行（ブラウザ自動起動も含む）
exec ./start.sh
