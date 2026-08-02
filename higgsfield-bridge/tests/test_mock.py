"""mock.py のジョブライフサイクルのテスト。"""
import imghdr
import tempfile
import unittest
from pathlib import Path

from higgsfield_bridge import mock


class MockLifecycleTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()

    def test_lifecycle_reaches_completed_after_two_polls(self):
        result = mock.submit_job("higgsfield-ai/soul/standard", {"prompt": "hello"}, root=self.root)
        request_id = result["request_id"]
        self.assertTrue(request_id.startswith("mock-"))

        first = mock.poll_status(request_id, root=self.root)
        self.assertEqual(first["status"], "in_progress")

        second = mock.poll_status(request_id, root=self.root)
        self.assertEqual(second["status"], "completed")
        self.assertIn("assets", second["raw"])

        # 一度 completed になったら以降のポーリングは状態を変えない（終端状態）。
        third = mock.poll_status(request_id, root=self.root)
        self.assertEqual(third["status"], "completed")

    def test_download_assets_writes_valid_png(self):
        result = mock.submit_job("higgsfield-ai/soul/standard", {"prompt": "hi"}, root=self.root)
        request_id = result["request_id"]
        mock.poll_status(request_id, root=self.root)  # queued -> in_progress
        mock.poll_status(request_id, root=self.root)  # in_progress -> completed

        with tempfile.TemporaryDirectory() as dest:
            downloaded = mock.download_assets(request_id, dest, root=self.root)
            self.assertEqual(len(downloaded), 1)
            out_path = Path(downloaded[0])
            self.assertTrue(out_path.exists())
            self.assertEqual(imghdr.what(str(out_path)), "png")

    def test_force_outcome_failed_marks_refunded(self):
        result = mock.submit_job(
            "higgsfield-ai/kling/3.0", {"prompt": "x"}, force_outcome="failed", root=self.root
        )
        request_id = result["request_id"]
        mock.poll_status(request_id, root=self.root)  # queued -> in_progress
        final = mock.poll_status(request_id, root=self.root)  # in_progress -> failed
        self.assertEqual(final["status"], "failed")
        self.assertTrue(final["raw"]["refunded"])

    def test_force_outcome_nsfw_marks_refunded(self):
        result = mock.submit_job(
            "higgsfield-ai/soul/standard", {"prompt": "x"}, force_outcome="nsfw", root=self.root
        )
        request_id = result["request_id"]
        mock.poll_status(request_id, root=self.root)
        final = mock.poll_status(request_id, root=self.root)
        self.assertEqual(final["status"], "nsfw")
        self.assertTrue(final["raw"]["refunded"])

    def test_download_before_completed_raises(self):
        result = mock.submit_job("higgsfield-ai/soul/standard", {"prompt": "x"}, root=self.root)
        request_id = result["request_id"]
        with tempfile.TemporaryDirectory() as dest:
            with self.assertRaises(RuntimeError):
                mock.download_assets(request_id, dest, root=self.root)

    def test_cancel_only_while_queued(self):
        result = mock.submit_job("higgsfield-ai/soul/standard", {"prompt": "x"}, root=self.root)
        request_id = result["request_id"]
        cancelled = mock.cancel_job(request_id, root=self.root)
        self.assertEqual(cancelled["status"], "cancelled")

        result2 = mock.submit_job("higgsfield-ai/soul/standard", {"prompt": "x"}, root=self.root)
        request_id2 = result2["request_id"]
        mock.poll_status(request_id2, root=self.root)  # -> in_progress
        with self.assertRaises(RuntimeError):
            mock.cancel_job(request_id2, root=self.root)

    def test_write_placeholder_png_is_valid_image(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "placeholder.png"
            mock.write_placeholder_png(out, width=16, height=16)
            self.assertTrue(out.exists())
            self.assertEqual(imghdr.what(str(out)), "png")


if __name__ == "__main__":
    unittest.main()
