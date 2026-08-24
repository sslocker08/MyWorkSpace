"""
Higgsfield Bridge の CLI エントリポイント。

使い方: python -m higgsfield_bridge <subcommand> ... --mode real|mock|dry-run

既定 mode は "mock"（鍵が無くてもパイプライン全体を試せる。実鍵を用意するまでの既定値）。
接続経路③ Cloud API の詳細（エンドポイント形状・パラメータ名等）は
`higgsfield-agentic-generation` スキルが draft のため未検証——client.py 内のコメントを参照。
"""
import argparse
import json
import sys

from . import anchor, client, ledger, mock


def _add_mode_arg(parser):
    parser.add_argument(
        "--mode",
        choices=["real", "mock", "dry-run"],
        default="mock",
        help="real=Cloud API 実行 / mock=ローカル模擬（既定・鍵不要） / dry-run=送信内容の表示のみ",
    )


def _parse_params(raw):
    if raw is None:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise SystemExit(f"--params は JSON 文字列で指定してください: {e}")


def cmd_submit(args):
    params = _parse_params(args.params)
    if args.mode == "dry-run":
        print("[dry-run] 送信予定のリクエスト:")
        print(f"  POST https://platform.higgsfield.ai/{args.model_id}")
        print(f"  body: {json.dumps(params, ensure_ascii=False)}")
        return
    if args.mode == "mock":
        result = mock.submit_job(args.model_id, params)
    else:
        result = client.submit_job(args.model_id, params)
    ledger.append_entry(args.model_id, params, "queued", result["request_id"])
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_status(args):
    if args.mode == "dry-run":
        print(f"[dry-run] GET https://platform.higgsfield.ai/requests/{args.request_id}/status")
        return
    if args.mode == "mock":
        result = mock.poll_status(args.request_id)
    else:
        result = client.poll_status(args.request_id)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_download(args):
    if args.mode == "dry-run":
        print(
            f"[dry-run] GET https://platform.higgsfield.ai/requests/{args.request_id}/status"
            f" からアセットURLを解決し {args.out} へダウンロード"
        )
        return
    if args.mode == "mock":
        paths_out = mock.download_assets(args.request_id, args.out)
    else:
        paths_out = client.download_assets(args.request_id, args.out)
    for p in paths_out:
        print(p)


def cmd_cancel(args):
    if args.mode == "dry-run":
        print(f"[dry-run] POST https://platform.higgsfield.ai/requests/{args.request_id}/cancel")
        return
    if args.mode == "mock":
        result = mock.cancel_job(args.request_id)
    else:
        result = client.cancel_job(args.request_id)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_anchor(args):
    if args.anchor_action == "submit":
        params = _parse_params(args.params)
        state = anchor.submit_anchor(args.name, args.model_id, params, mode=args.mode)
        print(f"state: {state}")
    elif args.anchor_action == "poll":
        state = anchor.poll_anchor(args.name, mode=args.mode)
        print(f"state: {state}")
    elif args.anchor_action == "approve":
        state = anchor.approve(args.name, note=args.note or "")
        print(f"state: {state}")
    elif args.anchor_action == "submit-video":
        params = _parse_params(args.params)
        state = anchor.submit_video(args.name, args.model_id, params, mode=args.mode)
        print(f"state: {state}")
    elif args.anchor_action == "status":
        print(f"state: {anchor.get_state(args.name)}")
    else:
        raise SystemExit(f"未知の anchor サブコマンド: {args.anchor_action}")


def cmd_ledger_report(args):
    report = ledger.build_report()
    print(ledger.format_report(report))


def build_parser():
    parser = argparse.ArgumentParser(
        prog="python -m higgsfield_bridge",
        description="Higgsfield Bridge CLI（Cloud API 接続経路③の薄いラッパー。既定は mock モード）",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_submit = sub.add_parser("submit", help="ジョブを投入する")
    p_submit.add_argument("--model-id", required=True, help='例: higgsfield-ai/soul/standard')
    p_submit.add_argument("--params", help="JSON 文字列（例 \'{\"prompt\": \"...\"}\'）")
    _add_mode_arg(p_submit)
    p_submit.set_defaults(func=cmd_submit)

    p_status = sub.add_parser("status", help="ジョブの状態を確認する（request-id だけで resume 可能）")
    p_status.add_argument("--request-id", required=True)
    _add_mode_arg(p_status)
    p_status.set_defaults(func=cmd_status)

    p_download = sub.add_parser("download", help="completed ジョブのアセットをダウンロードする")
    p_download.add_argument("--request-id", required=True)
    p_download.add_argument("--out", default="./downloads")
    _add_mode_arg(p_download)
    p_download.set_defaults(func=cmd_download)

    p_cancel = sub.add_parser("cancel", help="queued 中のジョブのみキャンセルする")
    p_cancel.add_argument("--request-id", required=True)
    _add_mode_arg(p_cancel)
    p_cancel.set_defaults(func=cmd_cancel)

    p_anchor = sub.add_parser("anchor", help="アンカーフレーム承認フロー（静止画→人間承認→動画化）")
    anchor_sub = p_anchor.add_subparsers(dest="anchor_action", required=True)

    p_a_submit = anchor_sub.add_parser("submit", help="安価な静止画（アンカー）ジョブを投入")
    p_a_submit.add_argument("--name", required=True)
    p_a_submit.add_argument("--model-id", required=True)
    p_a_submit.add_argument("--params")
    _add_mode_arg(p_a_submit)

    p_a_poll = anchor_sub.add_parser("poll", help="real モードでアンカージョブの完了を1回分進める")
    p_a_poll.add_argument("--name", required=True)
    _add_mode_arg(p_a_poll)

    p_a_approve = anchor_sub.add_parser("approve", help="人間の承認を記録する")
    p_a_approve.add_argument("--name", required=True)
    p_a_approve.add_argument("--note", default="")

    p_a_video = anchor_sub.add_parser("submit-video", help="承認済みアンカーを参照して動画ジョブを投入")
    p_a_video.add_argument("--name", required=True)
    p_a_video.add_argument("--model-id", required=True)
    p_a_video.add_argument("--params")
    _add_mode_arg(p_a_video)

    p_a_status = anchor_sub.add_parser("status", help="状態遷移を確認する")
    p_a_status.add_argument("--name", required=True)

    p_anchor.set_defaults(func=cmd_anchor)

    p_report = sub.add_parser("ledger-report", help="クレジット使用台帳をモデル別に集計表示する")
    p_report.set_defaults(func=cmd_ledger_report)

    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except client.HiggsfieldConfigError as e:
        # プレースホルダーゲート: スタックトレースを見せず、案内文だけを表示する。
        print(f"設定エラー: {e}", file=sys.stderr)
        return 1
    except (
        client.HiggsfieldAPIError,
        anchor.AnchorNotReadyError,
        anchor.AnchorNotApprovedError,
        ValueError,
        FileNotFoundError,
        RuntimeError,
    ) as e:
        print(f"エラー: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
