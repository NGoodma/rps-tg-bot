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
            const data = await request.json();
            const { telegramId, name, choice, result } = data;

            if (!telegramId) {
                return new Response("Missing telegramId", { status: 400, headers: corsHeaders });
            }

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
                    filter: { property: "Telegram ID", number: { equals: Number(telegramId) } }
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
            let recordedTotalGames = 0;

            // 4. Обновляем или создаем запись
            if (queryData.results && queryData.results.length > 0) {
                const page = queryData.results[0];
                finalPageId = page.id;

                const props = page.properties;
                recordedTotalGames = (props["Total Games"]?.number || 0) + 1;
                const wins = (props["Wins"]?.number || 0) + isWin;
                const losses = (props["Losses"]?.number || 0) + isLose;
                const draws = (props["Draws"]?.number || 0) + isDraw;

                await fetch(`${NOTION_URL}/pages/${finalPageId}`, {
                    method: 'PATCH',
                    headers: headers,
                    body: JSON.stringify({
                        properties: {
                            "Total Games": { number: recordedTotalGames },
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
                recordedTotalGames = 1;
                const createResponse = await fetch(`${NOTION_URL}/pages`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        parent: { database_id: DATABASE_ID },
                        properties: {
                            "Name": { title: [{ text: { content: name || "Unknown Player" } }] },
                            "Telegram ID": { number: Number(telegramId) },
                            "Total Games": { number: recordedTotalGames },
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

            // 6. Отложенное уведомление (Debounce 15 секунд)
            ctx.waitUntil((async () => {
                await new Promise(resolve => setTimeout(resolve, 15000));
                
                const getResponse = await fetch(`${NOTION_URL}/pages/${finalPageId}`, {
                    method: 'GET',
                    headers: headers
                });
                
                if (getResponse.ok) {
                    const pageData = await getResponse.json();
                    
                    // Сравниваем КОЛИЧЕСТВО игр, а не дату, так как Notion округляет секунды!
                    const latestTotalGames = pageData.properties["Total Games"]?.number || 0;
                    
                    console.log(`[Timer 15s] Woke up! My total=${recordedTotalGames}, Notion total=${latestTotalGames}`);
                    
                    // Если количество игр в Notion совпадает с тем, что записал этот конкретный запрос,
                    // значит НОВЫХ игр никто не сыграл! Отправляем сообщение.
                    if (latestTotalGames === recordedTotalGames) {
                         const wins = pageData.properties["Wins"]?.number || 0;
                         const losses = pageData.properties["Losses"]?.number || 0;
                         const draws = pageData.properties["Draws"]?.number || 0;
                         const latestChoice = pageData.properties["Last Choice"]?.select?.name || "Неизвестно";
                         
                         const choiceMap = { 'rock': 'Камень ✊', 'scissors': 'Ножницы ✌️', 'paper': 'Бумага ✋' };
                         const choiceRu = choiceMap[latestChoice] || latestChoice;
                         
                         let resultText = '';
                         if (latestTotalGames === 1) {
                             resultText = `👋 <b>Добро пожаловать, ${name || 'Игрок'}!</b> Первая игра сыграна.`;
                         } else {
                             resultText = `🎮 <b>Игровая сессия завершена!</b>`;
                         }

                         const tgMessage = `${resultText}\nВаш последний выбор: ${choiceRu}\n\n📊 <b>Финальная статистика из Notion:</b>\nИгр: ${latestTotalGames}\nПобед: ${wins}\nПоражений: ${losses}\nНичьих: ${draws}`;
                         
                         console.log("[Timer 15s] Sending to Telegram...");
                         const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chat_id: telegramId, text: tgMessage, parse_mode: 'HTML' })
                         });
                         
                         const tgText = await tgRes.text();
                         console.log(`[Timer 15s] Telegram response: ${tgRes.status} ${tgText}`);
                    } else {
                         console.log("[Timer 15s] Skipping Telegram send, another game was played after this one.");
                    }
                } else {
                    console.log("[Timer 15s] Failed to fetch from Notion:", await getResponse.text());
                }
            })());

            return new Response(JSON.stringify({ status: "success" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        } catch (e) {
            console.error(e);
            return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
        }
    },
};
