"""client.py のプレースホルダーゲート（認証情報未設定時の挙動）のテスト。

要件: 鍵が無いときはスタックトレースではなく、docs/HUMAN-TASKS.md を案内する
分かりやすい日本語エラーになること。
"""
import io
import os
import unittest
from contextlib import redirect_stderr

from higgsfield_bridge import cli, client


class PlaceholderGateTest(unittest.TestCase):
    def setUp(self):
        self._saved_key = os.environ.pop("HIGGSFIELD_API_KEY", None)
        self._saved_secret = os.environ.pop("HIGGSFIELD_API_SECRET", None)

    def tearDown(self):
        if self._saved_key is not None:
            os.environ["HIGGSFIELD_API_KEY"] = self._saved_key
        if self._saved_secret is not None:
            os.environ["HIGGSFIELD_API_SECRET"] = self._saved_secret

    def test_get_credentials_raises_config_error_when_missing(self):
        with self.assertRaises(client.HiggsfieldConfigError) as ctx:
            client.get_credentials()
        message = str(ctx.exception)
        self.assertIn("HUMAN-TASKS.md", message)
        self.assertIn("HIGGSFIELD_API_KEY", message)
        self.assertIn("HIGGSFIELD_API_SECRET", message)

    def test_submit_job_gates_before_any_network_call(self):
        # 鍵が無い状態で submit_job を呼んでも HiggsfieldConfigError（ネットワークエラーではない）。
        with self.assertRaises(client.HiggsfieldConfigError):
            client.submit_job("higgsfield-ai/soul/standard", {"prompt": "x"})

    def test_poll_status_gates_before_any_network_call(self):
        with self.assertRaises(client.HiggsfieldConfigError):
            client.poll_status("req-1")

    def test_cli_real_mode_without_credentials_prints_friendly_error_no_traceback(self):
        stderr = io.StringIO()
        with redirect_stderr(stderr):
            exit_code = cli.main(
                ["submit", "--model-id", "higgsfield-ai/soul/standard", "--mode", "real"]
            )
        output = stderr.getvalue()
        self.assertEqual(exit_code, 1)
        self.assertIn("設定エラー", output)
        self.assertIn("HUMAN-TASKS.md", output)
        self.assertNotIn("Traceback", output)

    def test_cli_mock_mode_does_not_require_credentials(self):
        stderr = io.StringIO()
        exit_code = cli.main(
            ["submit", "--model-id", "higgsfield-ai/soul/standard", "--mode", "mock"]
        )
        self.assertEqual(exit_code, 0)

    def test_cli_dry_run_mode_does_not_require_credentials(self):
        exit_code = cli.main(
            ["submit", "--model-id", "higgsfield-ai/soul/standard", "--mode", "dry-run"]
        )
        self.assertEqual(exit_code, 0)


if __name__ == "__main__":
    unittest.main()
