"""anchor.py の状態機械（seed -> anchor_submitted/ready -> approved -> video_submitted）のテスト。"""
import tempfile
import unittest

from higgsfield_bridge import anchor


class AnchorStateMachineTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()

    def test_seed_state_before_any_submission(self):
        self.assertEqual(anchor.get_state("shot-1", root=self.root), anchor.SEED)

    def test_mock_submit_reaches_anchor_ready_synchronously(self):
        state = anchor.submit_anchor(
            "shot-1", "higgsfield-ai/soul/standard", {"prompt": "hero shot"},
            mode="mock", root=self.root,
        )
        self.assertEqual(state, anchor.ANCHOR_READY)
        anchor_png = anchor.anchor_dir("shot-1", root=self.root) / "anchor.png"
        self.assertTrue(anchor_png.exists())

    def test_submit_video_without_approval_raises(self):
        anchor.submit_anchor(
            "shot-2", "higgsfield-ai/soul/standard", {"prompt": "x"}, mode="mock", root=self.root
        )
        with self.assertRaises(anchor.AnchorNotApprovedError):
            anchor.submit_video(
                "shot-2", "higgsfield-ai/kling/3.0", {"prompt": "video"}, mode="mock", root=self.root
            )

    def test_approve_before_anchor_ready_raises(self):
        with self.assertRaises(anchor.AnchorNotReadyError):
            anchor.approve("shot-3", root=self.root)

    def test_full_happy_path_seed_to_video_submitted(self):
        name = "shot-4"
        model_still = "higgsfield-ai/soul/standard"
        model_video = "higgsfield-ai/kling/3.0"

        self.assertEqual(anchor.get_state(name, root=self.root), anchor.SEED)

        state = anchor.submit_anchor(name, model_still, {"prompt": "hero"}, mode="mock", root=self.root)
        self.assertEqual(state, anchor.ANCHOR_READY)
        self.assertFalse(anchor.is_approved(name, root=self.root))

        state = anchor.approve(name, root=self.root, note="人間が確認しOK")
        self.assertEqual(state, anchor.APPROVED)
        self.assertTrue(anchor.is_approved(name, root=self.root))

        state = anchor.submit_video(
            name, model_video, {"prompt": "animate hero shot"}, mode="mock", root=self.root
        )
        self.assertEqual(state, anchor.VIDEO_SUBMITTED)

    def test_video_job_references_anchor_image(self):
        name = "shot-5"
        anchor.submit_anchor(
            name, "higgsfield-ai/soul/standard", {"prompt": "still"}, mode="mock", root=self.root
        )
        anchor.approve(name, root=self.root)
        anchor.submit_video(name, "higgsfield-ai/kling/3.0", {"prompt": "video"}, mode="mock", root=self.root)

        import json
        video_job_path = anchor.anchor_dir(name, root=self.root) / "video_job.json"
        video_job = json.loads(video_job_path.read_text(encoding="utf-8"))
        self.assertIn("reference_image", video_job["params"])
        self.assertTrue(video_job["params"]["reference_image"].startswith("data:image/png;base64,"))

    def test_dry_run_does_not_advance_state(self):
        name = "shot-6"
        state = anchor.submit_anchor(
            name, "higgsfield-ai/soul/standard", {"prompt": "x"}, mode="dry-run", root=self.root
        )
        self.assertEqual(state, anchor.SEED)


if __name__ == "__main__":
    unittest.main()
