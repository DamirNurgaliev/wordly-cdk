import * as cheerio from "cheerio";
import * as fs from "fs";

const fetchWords = async () => {
  const russianAlphabet = ["а", "б", "в", "г", "д", "е", "ж", "з", "и", "и", "к", "л", "м", "н", "о",
    "п", "р", "с", "т", "у", "ф", "х", "ц", "ч", "ш", "щ", "э", "ю", "я"
  ]

  const file = fs.createWriteStream("files/ruFiveWords.txt");

  for (const letter of russianAlphabet) {
    const response = await fetch(`https://lexicography.online/explanatory/ushakov/${letter}/`);
    const body = await response.text();

    const htmlData = cheerio.load(body);

    htmlData("section.a-list li").each((_id, el) => {
      if (htmlData(el).text().length === 5 && htmlData(el).text().slice(-1) !== "…") {
        file.write(`${htmlData(el).text()}\n`)
      }
    });
  }

  console.log('File successfully generated')
};

fetchWords()