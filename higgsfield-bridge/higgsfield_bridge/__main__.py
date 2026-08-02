"""`python -m higgsfield_bridge ...` のエントリポイント。実体は cli.py。"""
import sys

from .cli import main

if __name__ == "__main__":
    sys.exit(main())
