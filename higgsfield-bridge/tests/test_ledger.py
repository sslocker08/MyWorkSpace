"""ledger.py の追記・集計のテスト。"""
import tempfile
import unittest

from higgsfield_bridge import ledger


class LedgerTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()

    def test_append_entry_writes_expected_fields(self):
        entry = ledger.append_entry(
            "higgsfield-ai/soul/standard", {"prompt": "a"}, "queued", "req-1", root=self.root
        )
        self.assertEqual(entry["model_id"], "higgsfield-ai/soul/standard")
        self.assertEqual(entry["status"], "queued")
        self.assertEqual(entry["request_id"], "req-1")
        self.assertIsNone(entry["credits_estimated"])
        self.assertIsNone(entry["credits_actual"])
        self.assertIn("ts", entry)
        self.assertIn("params_hash", entry)

    def test_read_entries_round_trips(self):
        ledger.append_entry("model-a", {"p": 1}, "queued", "req-1", root=self.root)
        ledger.append_entry("model-b", {"p": 2}, "completed", "req-2", root=self.root)
        entries = ledger.read_entries(root=self.root)
        self.assertEqual(len(entries), 2)
        self.assertEqual(entries[0]["request_id"], "req-1")
        self.assertEqual(entries[1]["request_id"], "req-2")

    def test_read_entries_empty_when_no_file(self):
        self.assertEqual(ledger.read_entries(root=self.root), [])

    def test_params_hash_stable_regardless_of_key_order(self):
        h1 = ledger.params_hash({"a": 1, "b": 2})
        h2 = ledger.params_hash({"b": 2, "a": 1})
        self.assertEqual(h1, h2)

    def test_build_report_counts_per_model_and_status(self):
        ledger.append_entry("model-a", {"p": 1}, "queued", "req-1", root=self.root)
        ledger.append_entry("model-a", {"p": 2}, "completed", "req-2", root=self.root)
        ledger.append_entry("model-b", {"p": 3}, "failed", "req-3", root=self.root)

        report = ledger.build_report(root=self.root)
        self.assertEqual(report["total_jobs"], 3)
        self.assertEqual(report["per_model"]["model-a"]["count"], 2)
        self.assertEqual(report["per_model"]["model-a"]["by_status"]["queued"], 1)
        self.assertEqual(report["per_model"]["model-a"]["by_status"]["completed"], 1)
        self.assertEqual(report["per_model"]["model-b"]["count"], 1)
        self.assertEqual(report["per_model"]["model-b"]["by_status"]["failed"], 1)

    def test_build_report_tracks_known_credits_actual(self):
        ledger.append_entry(
            "model-a", {"p": 1}, "completed", "req-1", credits_actual=12, root=self.root
        )
        ledger.append_entry("model-a", {"p": 2}, "completed", "req-2", root=self.root)
        report = ledger.build_report(root=self.root)
        bucket = report["per_model"]["model-a"]
        self.assertEqual(bucket["credits_actual_known"], 1)
        self.assertEqual(bucket["credits_actual_sum"], 12)

    def test_format_report_empty(self):
        report = ledger.build_report(root=self.root)
        text = ledger.format_report(report)
        self.assertIn("総ジョブ数: 0", text)
        self.assertIn("台帳は空です", text)

    def test_format_report_nonempty_mentions_model(self):
        ledger.append_entry("model-a", {"p": 1}, "queued", "req-1", root=self.root)
        report = ledger.build_report(root=self.root)
        text = ledger.format_report(report)
        self.assertIn("model-a", text)
        self.assertIn("queued", text)


if __name__ == "__main__":
    unittest.main()
