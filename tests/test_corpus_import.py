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
        data = corpus.hv1(pages)
        self.assertEqual(len(data[0]["questions"]), 8)
        self.assertEqual(data[0]["questions"][0]["answerText"], "G. Jobs fördern Kompetenzen.")
        self.assertEqual(data[0]["mode"], "corpus-card")

    def test_hv1_uses_summary_not_later_transcripts_or_mnemonic(self):
        pages = [""] * 329
        lines = ["Teil 2 Studiengebühren"]
        for i in range(1, 9):
            lines += [f"Sprecher {i}", f"Zusammenfassung {i}.", f"中文第{i}项。"]
        lines += ["口诀不能进入翻译。", "Sprecher 1", "A very long old transcript."]
        pages[184] = "\n".join(lines)
        group = corpus.hv1(pages)[0]
        self.assertEqual(len(group["questions"]), 8)
        self.assertEqual(group["questions"][0]["leitsatz"], "Zusammenfassung 1.")
        self.assertEqual(group["questions"][-1]["chinese"], "中文第8项。")
        self.assertTrue(all(q["sourceAnswer"] is None and not q["answer"] for q in group["questions"]))

    def test_hv1_replacement_prunes_legacy_groups_and_sorts_source_variants(self):
        pages = [""] * 329
        lines = []
        for key in corpus.HV1_TEILS:
            title = {"12-2": "Teil 12 Grünflächen", "13-2": "Teil 13（2） Nebenjob im Studium",
                     "14-1": "Teil 14 Online Bücher", "14-2": "Teil 14 Bargeld"}.get(key, f"Teil {key} Thema")
            lines.append(title)
            for i in range(1, 11 if key == 17 else 9):
                if key == 17:
                    lines += [f"{chr(64+i)}. Ein Satz {i}.", f"中文第{i}项。"]
                else:
                    lines.append(f"Speaker {i}")
                    if key == 3 and i == 7:
                        lines += ["Wer während des Studiums ein Kind bekommt, hat kaumer Möglichkeiten.",
                                  "Wer während des Studiums ein Kind bekommt, hat weniger Möglichkeiten."]
                    else:
                        lines.append(f"Ein Satz {i}.")
                    lines.append(f"中文第{i}项。")
        pages[181] = "\n".join(lines)
        data = [{"teil": 99, "questions": [{"audio": "old.wav", "answer": "A"}]}]
        corpus.add_hv1(pages, data)
        self.assertEqual([s["teil"] for s in data], corpus.HV1_TEILS)
        self.assertFalse(any("audio" in q or q["answer"] for s in data for q in s["questions"]))
        q = data[2]["questions"][6]
        self.assertIn("weniger", q["leitsatz"])
        self.assertEqual(len(q["sourceVariants"]), 2)
        before = str(data)
        corpus.add_hv1(pages, data)
        self.assertEqual(str(data), before)

    def test_hv1_incomplete_source_cannot_replace_the_current_corpus(self):
        pages = [""] * 329
        data = [{"teil": 1, "questions": []}]
        with self.assertRaises(AssertionError):
            corpus.add_hv1(pages, data)
        self.assertEqual(data, [{"teil": 1, "questions": []}])

    def test_hv1_hyphenated_word_is_not_an_invented_answer_marker(self):
        statement, letter = corpus.hv1_statement("E-Mails haben Vorteile gegenüber Briefverkehr .", answer_markers=False)
        self.assertEqual(statement, "E-Mails haben Vorteile gegenüber Briefverkehr.")
        self.assertIsNone(letter)


if __name__ == "__main__":
    unittest.main()
