"""
リポジトリ内の相対パス解決を一箇所に集約するモジュール。

このプロジェクトは一時的な場所（後日 別ディレクトリへ移動予定）で開発されているため、
コード中に絶対パスを一切書かない。すべて `__file__`（このファイル自身の場所）を起点に
した相対解決にすることで、フォルダごと別の場所へ移動しても壊れないようにする。

各関数は `root` 引数を受け取れる。通常の実行時は省略してプロジェクトルート基準の
既定パスを使うが、テストでは一時ディレクトリを渡して本番の ledger/anchors/mock_state
を汚染しないようにする。
"""
from pathlib import Path

# このファイル（higgsfield_bridge/paths.py）から2階層上がプロジェクトルート。
PACKAGE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_DIR.parent


def _root(root):
    return Path(root) if root is not None else PROJECT_ROOT


def ledger_dir(root=None):
    d = _root(root) / "ledger"
    d.mkdir(parents=True, exist_ok=True)
    return d


def ledger_file(root=None):
    return ledger_dir(root) / "usage.jsonl"


def anchors_root(root=None):
    d = _root(root) / "anchors"
    d.mkdir(parents=True, exist_ok=True)
    return d


def mock_state_root(root=None):
    d = _root(root) / "mock_state"
    d.mkdir(parents=True, exist_ok=True)
    return d
