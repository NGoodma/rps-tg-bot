export default {
    async fetch(request, env, ctx) {
        // 1. Handle CORS 
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
        }

        try {
            // 2. Получаем данные от игры
            const data = await request.json();
            const { telegramId, name, choice, result } = data;

            if (!telegramId) {
                return new Response("Missing telegramId", { status: 400, headers: corsHeaders });
            }

            // API ключи Notion берем из переменных окружения Cloudflare
            const NOTION_API_KEY = env.NOTION_API_KEY;
            const DATABASE_ID = env.NOTION_DATABASE_ID;
            const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || "8739297942:AAFKFXXe-Z5fc6f9AGLJ-DLgE3mAotAUoAI";

            const NOTION_VERSION = "2022-06-28";
            const NOTION_URL = "https://api.notion.com/v1";

            const headers = {
                "Authorization": `Bearer ${NOTION_API_KEY}`,
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json"
            };

            const now = new Date().toISOString();

            const queryResponse = await fetch(`${NOTION_URL}/databases/${DATABASE_ID}/query`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    filter: {
                        property: "Telegram ID",
                        number: {
                            equals: Number(telegramId)
                        }
                    }
                })
            });

            if (!queryResponse.ok) {
                const queryErr = await queryResponse.text();
                console.error("❌ Notion Query Error:", queryErr);
                return new Response(JSON.stringify({ error: "Query Error", details: queryErr }), { status: 500, headers: corsHeaders });
            }

            const queryData = await queryResponse.json();
            console.log("✅ Query Success. Found records:", queryData.results?.length);

            let isWin = result === 'win' ? 1 : 0;
            let isLose = result === 'lose' ? 1 : 0;
            let isDraw = result === 'draw' ? 1 : 0;

            let finalPageId = null;

            // 4. Если игрок уже есть в базе — обновляем его запись
            if (queryData.results && queryData.results.length > 0) {
                const page = queryData.results[0];
                finalPageId = page.id;

                // Текущие значения
                const props = page.properties;
                const total = (props["Total Games"]?.number || 0) + 1;
                const wins = (props["Wins"]?.number || 0) + isWin;
                const losses = (props["Losses"]?.number || 0) + isLose;
                const draws = (props["Draws"]?.number || 0) + isDraw;

                // Отправляем PATCH запрос на обновление
                await fetch(`${NOTION_URL}/pages/${finalPageId}`, {
                    method: 'PATCH',
                    headers: headers,
                    body: JSON.stringify({
                        properties: {
                            "Total Games": { number: total },
                            "Wins": { number: wins },
                            "Losses": { number: losses },
                            "Draws": { number: draws },
                            "Last Choice": { select: { name: choice } },
                            "Last Active": { date: { start: now } },
                            "Updated At": { date: { start: now } }
                        }
                    })
                });

            } else {
                // 5. Если игрока нет — создаем новую запись
                const createResponse = await fetch(`${NOTION_URL}/pages`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        parent: { database_id: DATABASE_ID },
                        properties: {
                            "Name": { title: [{ text: { content: name || "Unknown Player" } }] },
                            "Telegram ID": { number: Number(telegramId) },
                            "Total Games": { number: 1 },
                            "Wins": { number: isWin },
                            "Losses": { number: isLose },
                            "Draws": { number: isDraw },
                            "Last Choice": { select: { name: choice } },
                            "First Login": { date: { start: now } },
                            "Last Active": { date: { start: now } },
                            "Updated At": { date: { start: now } }
                        }
                    })
                });

                if (!createResponse.ok) {
                    const errorText = await createResponse.text();
                    console.error("❌ Notion Create Error:", errorText);
                    return new Response(JSON.stringify({ error: "Notion API Error", details: errorText }), { status: 500, headers: corsHeaders });
                }

                const newPageData = await createResponse.json();
                finalPageId = newPageData.id;
                console.log("✅ Custom record created successfully!");
            }

            // 6. Отложенное уведомление (Debounce 30 секунд), и чтение данных ИЗ NOTION
            ctx.waitUntil((async () => {
                // Ждём 30 секунд. Если за это время игрок сыграет ещё, Cloudflare запустит ещё одну функцию
                // и обновит Notion на новое значение `Last Active`.
                await new Promise(resolve => setTimeout(resolve, 30000));

                // Делаем GET-запрос в Notion
                const getResponse = await fetch(`${NOTION_URL}/pages/${finalPageId}`, {
                    method: 'GET',
                    headers: headers
                });

                if (getResponse.ok) {
                    const pageData = await getResponse.json();
                    const latestUpdate = pageData.properties["Last Active"]?.date?.start;

                    // Сравниваем даты через Timestamp, так как Notion может обрезать миллисекунды или менять формат
                    const latestTime = new Date(latestUpdate).getTime();
                    const nowTime = new Date(now).getTime();

                    console.log(`[Timer 30s] Woke up! now=${nowTime}, latest=${latestTime}`);

                    // Если `now` совпадает с `latestUpdate` (в пределах 1-2 секунд)
                    if (Math.abs(latestTime - nowTime) < 2000) {
                        const props = pageData.properties;
                        const total = props["Total Games"]?.number || 0;
                        const wins = props["Wins"]?.number || 0;
                        const losses = props["Losses"]?.number || 0;
                        const draws = props["Draws"]?.number || 0;
                        const latestChoice = props["Last Choice"]?.select?.name || "Неизвестно";

                        const choiceMap = { 'rock': 'Камень ✊', 'scissors': 'Ножницы ✌️', 'paper': 'Бумага ✋' };
                        const choiceRu = choiceMap[latestChoice] || latestChoice;

                        // Приветственное сообщение или завершение сессии
                        let resultText = '';
                        if (total === 1) {
                            resultText = `👋 <b>Добро пожаловать, ${name || 'Игрок'}!</b> Первая игра сыграна.`;
                        } else {
                            resultText = `🎮 <b>Игровая сессия завершена!</b>`;
                        }

                        const tgMessage = `${resultText}\nВаш последний выбор: ${choiceRu}\n\n📊 <b>Финальная статистика из Notion:</b>\nИгр: ${total}\nПобед: ${wins}\nПоражений: ${losses}\nНичьих: ${draws}`;

                        console.log("[Timer 30s] Sending to Telegram...");
                        const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chat_id: telegramId, text: tgMessage, parse_mode: 'HTML' })
                        });

                        const tgText = await tgRes.text();
                        console.log(`[Timer 30s] Telegram response: ${tgRes.status} ${tgText}`);
                    } else {
                        console.log("[Timer 30s] Skipping Telegram send, another game was played after this one.");
                    }
                } else {
                    console.log("[Timer 30s] Failed to fetch from Notion:", await getResponse.text());
                }
            })());

            return new Response(JSON.stringify({ status: "success" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        } catch (e) {
            console.error(e);
            return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
        }
    },
};
