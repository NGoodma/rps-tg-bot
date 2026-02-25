export default {
    async fetch(request, env, ctx) {
        // 1. Handle CORS (чтобы браузер мог делать запросы)
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

            const NOTION_VERSION = "2022-06-28";
            const NOTION_URL = "https://api.notion.com/v1";

            const headers = {
                "Authorization": `Bearer ${NOTION_API_KEY}`,
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json"
            };

            const now = new Date().toISOString();

            // 3. Ищем пользователя в базе данных Notion по Telegram ID
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

            const queryData = await queryResponse.json();

            let isWin = result === 'win' ? 1 : 0;
            let isLose = result === 'lose' ? 1 : 0;
            let isDraw = result === 'draw' ? 1 : 0;

            // 4. Если игрок уже есть в базе — обновляем его запись
            if (queryData.results && queryData.results.length > 0) {
                const page = queryData.results[0];
                const pageId = page.id;

                // Текущие значения
                const props = page.properties;
                const total = (props["Total Games"]?.number || 0) + 1;
                const wins = (props["Wins"]?.number || 0) + isWin;
                const losses = (props["Losses"]?.number || 0) + isLose;
                const draws = (props["Draws"]?.number || 0) + isDraw;

                // Отправляем PATCH запрос на обновление
                await fetch(`${NOTION_URL}/pages/${pageId}`, {
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

                return new Response(JSON.stringify({ status: "updated" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
                    return new Response(JSON.stringify({ error: "Notion API Error", details: errorText }), { status: 500, headers: corsHeaders });
                }

                return new Response(JSON.stringify({ status: "created" }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
        }
    },
};
