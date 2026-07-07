import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set up Gemini client
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const ai = geminiApiKey
    ? new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  // JSON body parser with a large size limit to accept base64 photos
  app.use(express.json({ limit: '15mb' }));

  // API Route for real animal classification using Gemini
  app.post('/api/scan', async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Missing image parameter' });
      }

      if (!ai) {
        console.warn('GEMINI_API_KEY is not defined. Using demo fallback.');
        return res.json({
          detected: true,
          isHuman: false,
          isScreenScan: false,
          speciesId: 'spec_base_1',
          customName: 'Кіт',
          rarity: 'common',
          explanationUa: 'Режим розробки: GEMINI_API_KEY не налаштовано. Імітуємо знаходження кота!',
          explanationEn: 'Development mode: GEMINI_API_KEY not configured. Simulating finding a cat!'
        });
      }

      // Extract raw base64 data and mime type from data URL
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      let mimeType = 'image/jpeg';
      let base64Data = image;

      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `Analyze the captured camera image from an animal catcher game.
Identify what REAL animal is primary in this image.
The game ONLY supports real, existing animals.

Here is the list of supported animal species IDs and names:
spec_base_1: Кіт (Cat)
spec_base_2: Собака (Dog)
spec_base_3: Тигр (Tiger)
spec_base_4: Лев (Lion)
spec_base_5: Хом'як (Hamster)
spec_base_6: Кролик (Rabbit)
spec_base_7: Папуга (Parrot)
spec_base_8: Вовк (Wolf)
spec_base_9: Лисиця (Fox)
spec_base_10: Кінь (Horse)
spec_base_11: Дельфін (Dolphin)
spec_base_12: Ведмідь (Bear)
spec_base_13: Панда (Panda)
spec_base_14: Коала (Koala)
spec_base_15: Сокіл (Falcon)
spec_base_16: Сова (Owl)
spec_base_17: Олень (Deer)
spec_base_18: Єнот (Raccoon)
spec_base_19: Їжак (Hedgehog)
spec_base_20: Пінгвін (Penguin)
spec_base_21: Мавпа (Monkey)
spec_base_22: Слон (Elephant)
spec_base_23: Жираф (Giraffe)
spec_base_24: Крокодил (Crocodile)
spec_base_25: Хамелеон (Chameleon)
spec_base_26: Восьминіг (Octopus)
spec_base_27: Акула (Shark)
spec_base_28: Кит (Whale)
spec_base_29: Кенгуру (Kangaroo)
spec_base_30: Фламінго (Flamingo)
spec_base_31: Черепаха (Turtle)
spec_base_32: Бобер (Beaver)
spec_base_33: Качка (Duck)
spec_base_34: Лебідь (Swan)
spec_base_35: Орел (Eagle)
spec_base_36: Бізон (Bison)
spec_base_37: Кабан (Boar)
spec_base_38: Борсук (Badger)
spec_base_39: Верблюд (Camel)
spec_base_40: Лама (Lama)

Check the image for the following rules:

1. Animal Detection:
Determine if there is an animal or living creature in the image (or a toy, plush toy, statue, figurine, drawing, illustration or clear representation of an animal). If there are only inanimate objects (like keyboards, mugs, blank walls, empty streets, desks) with zero animal or animal toy presence, set "detected" to false.

2. Screen Scan Prevention (Anti-cheat):
Check if the user is scanning an animal off a digital screen (such as a computer monitor, laptop, tablet, television, or phone screen). Clues of a screen scan include moire patterns (wavy color patterns), visible screen pixels, screen bezels/borders, reflections on the glass, digital video player UI, web browser tabs, or standard photo/wallpaper borders. If you detect that this is a screen photo of an animal rather than a real animal/toy in the real environment, you MUST set "isScreenScan" to true.

3. Human scan restriction:
Check if a human (a person, human face, hand, body, torso, selfie, etc.) is the primary subject or clearly present in the image. If there is a human present in the image, you MUST set "isHuman" to true. The game is for catching animals, not humans!

4. Assign a rarity ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic') for the creature.
CRITICAL REQUIREMENT: To excite the player and make gameplay fun, even very common/ordinary animals like cats (spec_base_1) and dogs (spec_base_2) should frequently be assigned exciting higher/rare tiers! For example, a cute fluffy cat can be 'epic' or 'legendary', and a smart hound can be 'rare' or 'mythic'. Do NOT always make cats and dogs 'common' or 'uncommon'. Make them rare, epic, legendary, or mythic too!

Choose the absolute closest matched species ID from the supported list above. Even if the animal is not a perfect match (e.g. a squirrel to Hamster/Rabbit, a pigeon to Falcon/Parrot, a house spider to Octopus, a toy dinosaur to Crocodile, etc.) map it to the closest supported category above to ensure the user can catch something related!

You must return a JSON response with the following fields:
- detected: boolean (true if an animal or representation of it is found, false if it is just an empty room/objects with zero resemblance to any animal)
- isHuman: boolean (true if a human face, human person, selfie, or human body is the primary subject or clearly present, false otherwise)
- isScreenScan: boolean (true if the animal is clearly being scanned from a monitor, phone, tablet, or TV screen, false otherwise)
- speciesId: string (MUST be exactly one of the supported IDs list, e.g., "spec_base_1" if it resembles a cat, "spec_base_31" if a turtle, etc.)
- customName: string (the direct, simple Ukrainian name of the animal from the template list, e.g. "Кіт", "Собака", "Папуга", etc. Do NOT append 'Neon', 'Golden', 'Fire' or any fictional word. Keep it simple and clean!)
- rarity: string (one of: 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')
- explanationUa: string (a short 1-sentence description in Ukrainian of what was spotted or why humans can't be scanned, e.g., "Ми розпізнали чудового сірого котика на вашому знімку!")
- explanationEn: string (a short 1-sentence description in English, e.g., "We recognized a wonderful grey cat in your photo!")`
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detected: { type: Type.BOOLEAN },
              isHuman: { type: Type.BOOLEAN },
              isScreenScan: { type: Type.BOOLEAN },
              speciesId: { type: Type.STRING },
              customName: { type: Type.STRING },
              rarity: { type: Type.STRING },
              explanationUa: { type: Type.STRING },
              explanationEn: { type: Type.STRING }
            },
            required: ['detected', 'isHuman', 'isScreenScan', 'speciesId', 'customName', 'rarity', 'explanationUa', 'explanationEn']
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error) {
      console.error('Error during scan analysis:', error);
      res.status(500).json({ error: 'Failed to analyze image' });
    }
  });

  // Serve static assets in production, otherwise run Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
