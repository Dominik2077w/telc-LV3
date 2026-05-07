"""Manually add Teil 10-12 Leitsätze from PDF extraction."""
import json, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Teil 10 Pendeln - Leitsätze from PDF pages 210-211
teil10 = {
    "teil": 10,
    "title": "Pendeln",
    "questions": [
        {"number": 1, "leitsatz": "Pendeln ist für mich nur eine Notlösung.", "german": "Pendeln ist für mich nur eine Notlösung.", "text": "", "chinese": "通勤对我来说只是无奈的权宜之计。", "answer": "A", "audio": ""},
        {"number": 2, "leitsatz": "Ich muss mein Studium genau planen, weil ich pendeln.", "german": "Ich muss mein Studium genau planen, weil ich pendeln.", "text": "", "chinese": "因为我要通勤，所以我必须仔细计划我的学习。", "answer": "B", "audio": ""},
        {"number": 3, "leitsatz": "Pendeln hat Auswirkungen auf das soziale Leben der Studenten.", "german": "Pendeln hat Auswirkungen auf das soziale Leben der Studenten.", "text": "", "chinese": "通勤会影响学生的社交生活。", "answer": "C", "audio": ""},
        {"number": 4, "leitsatz": "Der Zeitverlust beim Pendeln wird durch den familiären Rückhalt ausgeglichen.", "german": "Der Zeitverlust beim Pendeln wird durch den familiären Rückhalt ausgeglichen.", "text": "", "chinese": "通勤造成的时间损失，部分可以靠家人的支持来弥补。", "answer": "D", "audio": ""},
        {"number": 5, "leitsatz": "Studenten sollten möglichst weiter im Elternhaus bleiben.", "german": "Studenten sollten möglichst weiter im Elternhaus bleiben.", "text": "", "chinese": "学生最好尽量继续住在父母家里。", "answer": "E", "audio": ""},
        {"number": 6, "leitsatz": "Lange Fahrtzeiten können sehr kräftezehrend sein.", "german": "Lange Fahrtzeiten können sehr kräftezehrend sein.", "text": "", "chinese": "漫长的通勤路程会非常耗费精力。", "answer": "F", "audio": ""},
        {"number": 7, "leitsatz": "Die eigene Wohnung fördert die Selbstständigkeit der Studenten.", "german": "Die eigene Wohnung fördert die Selbstständigkeit der Studenten.", "text": "", "chinese": "拥有自己的住所有助于培养学生的独立性。", "answer": "G", "audio": ""},
        {"number": 8, "leitsatz": "Durch die wegfallenden Mietkosten kann ich Rücklagen bilden.", "german": "Durch die wegfallenden Mietkosten kann ich Rücklagen bilden.", "text": "", "chinese": "因为不用支付房租，我可以攒下储蓄。", "answer": "H", "audio": ""},
    ],
}

# Teil 11 Studienfinanzierung - Leitsätze from PDF page 211
teil11 = {
    "teil": 11,
    "title": "Studienfinanzierung",
    "questions": [
        {"number": 1, "leitsatz": "Durch staatliche Förderung soll Zugang zur Hochschulbildung für alle hergestellt werden.", "german": "Durch staatliche Förderung soll Zugang zur Hochschulbildung für alle hergestellt werden.", "text": "", "chinese": "通过国家资助，应当为所有人创造进入高校学习的机会。", "answer": "A", "audio": ""},
        {"number": 2, "leitsatz": "Es fördert die Selbständigkeit, wenn Studierende ihren Lebensunterhalt durch Nebenjobs bestreiten.", "german": "Es fördert die Selbständigkeit, wenn Studierende ihren Lebensunterhalt durch Nebenjobs bestreiten.", "text": "", "chinese": "如果学生通过兼职来负担生活费，这有助于培养其独立性。", "answer": "B", "audio": ""},
        {"number": 3, "leitsatz": "Der jungen Generation sollte frühzeitig finanzielle Bildung vermittelt werden.", "german": "Der jungen Generation sollte frühzeitig finanzielle Bildung vermittelt werden.", "text": "", "chinese": "应该尽早向年轻一代传授金融理财知识。", "answer": "C", "audio": ""},
        {"number": 4, "leitsatz": "Unternehmen sollten mehr Fördermöglichkeiten für ihre zukünftigen Arbeitskräfte zur Verfügung stellen.", "german": "Unternehmen sollten mehr Fördermöglichkeiten für ihre zukünftigen Arbeitskräfte zur Verfügung stellen.", "text": "", "chinese": "企业应为其未来的劳动者提供更多资助渠道。", "answer": "D", "audio": ""},
        {"number": 5, "leitsatz": "Es sollten nur Studiengänge, die auf dem Arbeitsmarkt gefragt sind, gefördert werden.", "german": "Es sollten nur Studiengänge, die auf dem Arbeitsmarkt gefragt sind, gefördert werden.", "text": "", "chinese": "只应资助那些在劳动力市场上有需求的专业。", "answer": "E", "audio": ""},
        {"number": 6, "leitsatz": "Da Akademiker mehr verdienen, sollten sie die Kosten für ihr Studium selbst tragen.", "german": "Da Akademiker mehr verdienen, sollten sie die Kosten für ihr Studium selbst tragen.", "text": "", "chinese": "既然高校毕业生收入更高，他们就应自行承担学业成本。", "answer": "F", "audio": ""},
        {"number": 7, "leitsatz": "Man sollte Schulabgänger darauf aufmerksam machen, dass sie auch ohne Studium gute Verdienstmöglichkeiten haben können.", "german": "Man sollte Schulabgänger darauf aufmerksam machen, dass sie auch ohne Studium gute Verdienstmöglichkeiten haben können.", "text": "", "chinese": "应当提醒中学毕业生：即便不读大学，也可能获得不错的收入。", "answer": "G", "audio": ""},
        {"number": 8, "leitsatz": "Nicht alle Eltern sind bereit, ihren Kindern das Studium zu finanzieren.", "german": "Nicht alle Eltern sind bereit, ihren Kindern das Studium zu finanzieren.", "text": "", "chinese": "并非所有家长都愿意为子女的大学学习买单。", "answer": "H", "audio": ""},
    ],
}

# Teil 12 Gärten/Grünflächen - Leitsätze from PDF pages 212-213
teil12 = {
    "teil": 12,
    "title": "Gärten",
    "questions": [
        {"number": 1, "leitsatz": "Gemeinschaftsgärten können auch zu pädagogischen Zwecken eingesetzt werden.", "german": "Gemeinschaftsgärten können auch zu pädagogischen Zwecken eingesetzt werden.", "text": "", "chinese": "社区花园也可以用于教育目的。", "answer": "A", "audio": ""},
        {"number": 2, "leitsatz": "Grünflächen wirken sich positiv auf die psychische Gesundheit aus.", "german": "Grünflächen wirken sich positiv auf die psychische Gesundheit aus.", "text": "", "chinese": "绿地对心理健康有积极影响。", "answer": "B", "audio": ""},
        {"number": 3, "leitsatz": "Eine Stadt bietet mehr unkonventionelle Möglichkeiten, Grünflächen zu schaffen, als gedacht.", "german": "Eine Stadt bietet mehr unkonventionelle Möglichkeiten, Grünflächen zu schaffen, als gedacht.", "text": "", "chinese": "城市创造绿地的非常规方式比想象的更多。", "answer": "C", "audio": ""},
        {"number": 4, "leitsatz": "Städtische Grünflächen sind oft kein Musterbeispiel an Sauberkeit.", "german": "Städtische Grünflächen sind oft kein Musterbeispiel an Sauberkeit.", "text": "", "chinese": "城市绿地往往并不十分干净。", "answer": "D", "audio": ""},
        {"number": 5, "leitsatz": "Die Begrünung von Städten hat positive Auswirkungen auf das Stadtklima.", "german": "Die Begrünung von Städten hat positive Auswirkungen auf das Stadtklima.", "text": "", "chinese": "城市增绿对城市气候有正面影响。", "answer": "E", "audio": ""},
        {"number": 6, "leitsatz": "Projekte für mehr Grünflächen stoßen auf Widerstand bei Politikern.", "german": "Projekte für mehr Grünflächen stoßen auf Widerstand bei Politikern.", "text": "", "chinese": "扩增绿地的项目会遭到政界人士的阻力。", "answer": "F", "audio": ""},
        {"number": 7, "leitsatz": "Städte sind keine gute Umgebung für den Anbau von Gemüse.", "german": "Städte sind keine gute Umgebung für den Anbau von Gemüse.", "text": "", "chinese": "城市并不是适合种蔬菜的环境。", "answer": "G", "audio": ""},
        {"number": 8, "leitsatz": "Gemeinschaftsgärten stärken den Zusammenhalt im Stadtviertel.", "german": "Gemeinschaftsgärten stärken den Zusammenhalt im Stadtviertel.", "text": "", "chinese": "社区花园能增强街区凝聚力。", "answer": "H", "audio": ""},
    ],
}


def main():
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    # Load current data
    with open(os.path.join(ROOT, "data/hv1_questions.json"), "r", encoding="utf-8") as f:
        data = json.load(f)

    # Replace/add Teil 10-12
    existing_teils = {s["teil"] for s in data}
    for section in [teil10, teil11, teil12]:
        if section["teil"] in existing_teils:
            data = [s for s in data if s["teil"] != section["teil"]]
        data.append(section)
        print(f"Teil {section['teil']}: {section['title']} - {len(section['questions'])}q (no audio)")

    data.sort(key=lambda s: s["teil"])

    # Stats
    total_q = sum(len(s["questions"]) for s in data)
    total_audio = sum(1 for s in data for q in s["questions"] if q["audio"])
    print(f"\nTotal: {len(data)} Teils, {total_q} questions, {total_audio} with audio")

    # Write
    js = "window.HV1_QUESTIONS = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    with open(os.path.join(ROOT, "data/hv1_questions.js"), "w", encoding="utf-8") as f:
        f.write(js)
    with open(os.path.join(ROOT, "data/hv1_questions.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Written")


if __name__ == "__main__":
    main()
