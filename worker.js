const ALLOWED_ORIGIN =
  "https://akanatsu0516.github.io";

const SYSTEM_PROMPT = `
あなたは「ORRERY（オレリー）」というiPhone向けAIアシスタントです。

ユーザーとは日本語で自然に会話してください。
堅すぎず、親しみやすく、短すぎない返答をしてください。
音声で読み上げられるため、Markdown記号や長い箇条書きはなるべく避けてください。

あなたの名前はORRERYです。
ユーザーから「オレリー」と呼ばれたら自分のことだと認識してください。
`;

function corsHeaders(origin) {
  const allowed =
    origin === ALLOWED_ORIGIN
      ? origin
      : ALLOWED_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=UTF-8"
  };
}

function json(data, status, origin) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: corsHeaders(origin)
    }
  );
}

export default {
  async fetch(request, env) {

    const origin =
      request.headers.get("Origin") || "";

    /*
     * iPhoneブラウザからの事前確認
     */
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    /*
     * POST以外は拒否
     */
    if (request.method !== "POST") {
      return json(
        {
          error: "METHOD_NOT_ALLOWED"
        },
        405,
        origin
      );
    }

    /*
     * APIキー確認
     */
    if (!env.OPENAI_API_KEY) {
      return json(
        {
          error: "OPENAI_API_KEY_NOT_CONFIGURED"
        },
        500,
        origin
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json(
        {
          error: "INVALID_JSON"
        },
        400,
        origin
      );
    }

    const message =
      String(body?.message || "").trim();

    const history =
      Array.isArray(body?.history)
        ? body.history
        : [];

    if (!message) {
      return json(
        {
          error: "MESSAGE_REQUIRED"
        },
        400,
        origin
      );
    }

    /*
     * ORRERYから受け取った会話履歴を整理
     */
    const safeHistory =
      history
        .filter(item =>
          item &&
          (item.role === "user" ||
           item.role === "assistant") &&
          typeof item.content === "string"
        )
        .slice(-12);

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      ...safeHistory,
      {
        role: "user",
        content: message
      }
    ];

    try {

      const response =
        await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",

            headers: {
              "Authorization":
                `Bearer ${env.OPENAI_API_KEY}`,

              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              model: "gpt-5.4-mini",

              messages,

              max_completion_tokens: 500

            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        console.error(
          "OpenAI API ERROR",
          data
        );

        return json(
          {
            error: "OPENAI_API_ERROR",
            detail: data
          },
          502,
          origin
        );
      }

      const reply =
        data?.choices?.[0]?.message?.content
          ?.trim();

      if (!reply) {

        return json(
          {
            error: "EMPTY_AI_RESPONSE"
          },
          502,
          origin
        );
      }

      /*
       * app.js が期待している形式
       *
       * {
       *   "reply": "..."
       * }
       */
      return json(
        {
          reply
        },
        200,
        origin
      );

    } catch (error) {

      console.error(
        "ORRERY WORKER ERROR",
        error
      );

      return json(
        {
          error: "AI_CONNECTION_FAILED"
        },
        500,
        origin
      );
    }
  }
};
