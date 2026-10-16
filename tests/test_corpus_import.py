import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("corpus_import", ROOT / "scripts/update-corpus-2026-09.py")
corpus = importlib.util.module_from_spec(spec)
spec.loader.exec_module(corpus)


class CorpusImportTests(unittest.TestCase):
    def test_plain_answer_before_translated_name_does_not_leak(self):
        pages = [""] * 329
        pages[129] = "Teil 11 Test\n13.Die Kindheit von Erika Fuchs war schwierig. F Erika Fuchs 的童年很艰难。"
        q = corpus.lv3(pages)[0]["questions"][0]
        self.assertEqual(q["answer"], "F")
        self.assertEqual(q["german"], "Die Kindheit von Erika Fuchs war schwierig.")
        self.assertIn("Erika Fuchs", q["chinese"])

    def test_numbered_translation_is_not_a_duplicate_question(self):
        pages = [""] * 329
        pages[143] = "Teil19 Test\n17 Adebooye hat eine Methode entwickelt.\n17 Adeboye 开发了一种方法。（F）"
        questions = corpus.lv3(pages)[0]["questions"]
        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0]["answer"], "F")
        self.assertNotIn("Adeboye", questions[0]["german"])

    def test_new_compact_answer_notation_and_dash(self):
        pages = [""] * 329
        pages[146] = "Teil22 Tourismus\n13R. Der Tourismus wächst.\n旅游业增长。\n23–. Die Reiselust sinkt.\n旅行愿望下降。\n24. b) Chancen und Risiken\n机遇与风险"
        questions = corpus.lv3(pages)[0]["questions"]
        self.assertEqual([q["answer"] for q in questions], ["R", "X", "B"])
        self.assertEqual([q["addedIn"] for q in questions], ["2026.9"] * 3)

    def test_missing_title_answer_remains_unmarked(self):
        pages = [""] * 329
        pages[136] = "Teil 8 Reisen\n24-Weltenbummler einst und heute 环球旅行者：昔日与今日。"
        q = corpus.lv3(pages)[0]["questions"][0]
        self.assertIsNone(q["answer"])
        self.assertEqual(q["german"], "Weltenbummler einst und heute")

    def test_hv1_chinese_repeated_item_prefix_does_not_enter_german(self):
        pages = [""] * 329
        lines = ["Teil 13（2） Nebenjob im Studium"]
        for i in range(1, 9):
            lines += [f"Sprecher {i}", f"{46+i}：G: Jobs fördern Kompetenzen.", f"{46+i}：G：工作促进能力。"]
        pages[220] = "\n".join(lines)
        data = []
        corpus.add_hv1(pages, data)
        self.assertEqual(len(data[0]["questions"]), 8)
        self.assertEqual(data[0]["questions"][0]["answerText"], "G. Jobs fördern Kompetenzen.")
        self.assertEqual(data[0]["mode"], "corpus-card")


if __name__ == "__main__":
    unittest.main()
