const $ = s => document.querySelector(s);

const S = {
  endpoint: "https://orrery-ai.akanatsu0516.workers.dev",
  rec: null,
  listening: false,
  busy: false,
  visualStarted: false,
  history: [],
  speechUnlocked: false,
  finalReceived: false
};


/* =========================
   CLOCK
========================= */

function tick() {
  const d = new Date();

  const clock = $("#clock");
  const date = $("#date");

  if (clock) {
    clock.textContent = d.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  if (date) {
    date.textContent = d
      .toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric"
      })
      .toUpperCase();
  }
}

setInterval(tick, 300);
tick();


/* =========================
   WEATHER
========================= */

async function weather() {
  try {
    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=33.5902&longitude=130.4017&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FTokyo"
    );

    if (!response.ok) {
      throw new Error("WEATHER_HTTP_ERROR");
    }

    const data = await response.json();

    const current = data.current;

    const code = current.weather_code;
    const temp = Math.round(current.temperature_2m);
    const humidity = current.relative_humidity_2m;

    const icon =
      code === 0
        ? "☼"
        : code < 60
          ? "☁"
          : "◌";

    const description =
      code === 0
        ? "CLEAR"
        : code < 60
          ? "CLOUDY"
          : "PRECIP";

    if ($("#temp")) {
      $("#temp").textContent = `${temp}°`;
    }

    if ($("#weatherIcon")) {
      $("#weatherIcon").textContent = icon;
    }

    if ($("#weatherText")) {
      $("#weatherText").textContent = description;
    }

    if ($("#wTemp")) {
      $("#wTemp").textContent = `${temp}°`;
    }

    if ($("#wDesc")) {
      $("#wDesc").textContent = description;
    }

    if ($("#humidity")) {
      $("#humidity").textContent = `${humidity}%`;
    }

  } catch (error) {

    console.warn("Weather error:", error);

    if ($("#weatherText")) {
      $("#weatherText").textContent = "OFFLINE";
    }

    if ($("#wDesc")) {
      $("#wDesc").textContent = "OFFLINE";
    }
  }
}

weather();


/* =========================
   SYSTEM STATE
========================= */

function state(main, sub) {

  if ($("#listenLabel")) {
    $("#listenLabel").textContent = main;
  }

  if ($("#subLabel")) {
    $("#subLabel").textContent = sub;
  }

  if ($("#mode")) {
    $("#mode").textContent = main;
  }

  if ($("#talkState")) {
    $("#talkState").textContent =
      main === "STANDBY"
        ? "PRESS TO TALK"
        : `AI ${main}`;
  }

  if ($("#systemState")) {
    $("#systemState").textContent =
      main === "STANDBY"
        ? "● ONLINE"
        : `● ${main}`;
  }

  if ($("#audioState")) {
    $("#audioState").textContent =
      main === "STANDBY"
        ? "IDLE"
        : main;
  }

  if ($("#voiceStatus")) {
    $("#voiceStatus").textContent =
      main === "STANDBY"
        ? "READY"
        : main;
  }

  if ($("#activityText")) {
    $("#activityText").textContent = main;
  }
}


/* =========================
   CHAT DISPLAY
========================= */

function msg(who, text) {

  const box = $("#messages");

  if (!box) return;

  const element = document.createElement("div");

  element.className = `msg ${who}`;

  element.innerHTML =
    `<b>${who === "ai" ? "O" : "Y"}</b>` +
    `<div>` +
    `<small>${who === "ai" ? "ORRERY" : "YOU"}</small>` +
    `<p></p>` +
    `</div>`;

  const paragraph = element.querySelector("p");

  if (paragraph) {
    paragraph.textContent = String(text || "");
  }

  box.appendChild(element);

  box.scrollTop = box.scrollHeight;
}


/* =========================
   PREVIEW
========================= */

function preview(text) {

  const element = $("#preview");

  if (element) {
    element.textContent = text;
  }
}


/* =========================
   IOS SPEECH UNLOCK
========================= */

function unlockSpeech() {

  if (
    !("speechSynthesis" in window) ||
    S.speechUnlocked
  ) {
    return;
  }

  try {

    speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance("");

    utterance.lang = "ja-JP";
    utterance.volume = 0;

    speechSynthesis.speak(utterance);

    S.speechUnlocked = true;

  } catch (error) {

    console.warn(
      "Speech unlock error:",
      error
    );
  }
}


/* =========================
   JAPANESE VOICE
========================= */

function japaneseVoice() {

  if (!("speechSynthesis" in window)) {
    return null;
  }

  const voices =
    speechSynthesis.getVoices();

  return (
    voices.find(
      voice =>
        voice.lang === "ja-JP"
    ) ||
    voices.find(
      voice =>
        /^ja(-|_)/i.test(voice.lang)
    ) ||
    voices.find(
      voice =>
        /japanese|日本語/i.test(voice.name)
    ) ||
    null
  );
}


/* =========================
   SPEAK
========================= */

function speak(text) {

  if (
    !text ||
    !("speechSynthesis" in window)
  ) {

    state(
      "STANDBY",
      "「オレリー」と話しかけてください"
    );

    return;
  }

  try {

    speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        String(text)
      );

    utterance.lang = "ja-JP";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voice = japaneseVoice();

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {

      state(
        "SPEAKING",
        "ORRERY IS SPEAKING"
      );
    };

    utterance.onend = () => {

      state(
        "STANDBY",
        "「オレリー」と話しかけてください"
      );

      preview(
        "オレリーに話しかけてください"
      );
    };

    utterance.onerror = error => {

      console.warn(
        "Speech synthesis error:",
        error
      );

      state(
        "STANDBY",
        "音声出力を確認してください"
      );
    };

    /*
     * iPhone Safariでは、
     * 音声認識終了直後にspeechSynthesisを
     * 呼ぶと無視されることがあるため少し待つ。
     */
    setTimeout(() => {

      try {
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.warn(
          "Speech speak error:",
          error
        );
      }

    }, 80);

  } catch (error) {

    console.warn(
      "Speech error:",
      error
    );

    state(
      "STANDBY",
      "音声出力を確認してください"
    );
  }
}


/* =========================
   LOCAL AI
========================= */

function localAI(text) {

  if (/天気|気温|福岡/.test(text)) {

    return "福岡の現在の天気は画面に表示しています。AIリンクを接続すると、もっと詳しくお話しできます。";
  }

  if (/時間|何時/.test(text)) {

    return `現在時刻は${$("#clock")?.textContent || ""}です。`;
  }

  if (/自己紹介|名前|誰/.test(text)) {

    return "私はORRERY。あなたのiPhone上で動くAIアシスタントです。";
  }

  if (/こんにちは|こんにちわ|こんばんは|おはよう/.test(text)) {

    return "こんにちは。ORRERYはオンラインです。";
  }

  if (/ありがとう|ありがと/.test(text)) {

    return "どういたしまして。いつでも話しかけてください。";
  }

  if (/元気|調子/.test(text)) {

    return "システムは正常です。いつでも話しかけてください。";
  }

  return "現在はローカル会話モードです。";
}


/* =========================
   AI REQUEST
========================= */

async function ask(text) {

  const message =
    String(text || "").trim();

  if (!message || S.busy) {
    return;
  }

  S.busy = true;

  preview(message);

  /*
   * 音声入力から来た場合は、
   * ここでユーザー発言を表示する。
   */
  msg("user", message);

  state(
    "PROCESSING",
    "ORRERY AI IS THINKING"
  );

  let answer = "";

  try {

    /*
     * AI ENDPOINT
     */
    if (S.endpoint) {

      const response =
        await fetch(
          S.endpoint,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message,
              history:
                S.history.slice(-12)
            })
          }
        );

      let data;

try {
  data = await response.json();
} catch {
  data = {};
}

if (!response.ok) {

  console.error(
    "WORKER ERROR:",
    data
  );

  throw new Error(
    data?.detail?.error?.message ||
    data?.detail?.message ||
    data?.error ||
    `HTTP ${response.status}`
  );
}
      answer =
        data?.reply ||
        data?.output ||
        data?.message ||
        data?.output_text ||
        "";

      if (!answer) {

        throw new Error(
          "EMPTY_RESPONSE"
        );
      }

    } else {

      /*
       * Worker未設定時のローカル応答
       */
      answer = localAI(message);
    }

  } catch (error) {

    console.error(
      "ORRERY AI ERROR:",
      error
    );

    answer =
      "AIとの通信に失敗しました。";

  }


  /* =========================
     HISTORY
  ========================= */

  S.history.push({
    role: "user",
    content: message
  });

  S.history.push({
    role: "assistant",
    content: answer
  });


  /* =========================
     RESPONSE DISPLAY
  ========================= */

  msg("ai", answer);

  preview(answer);

  S.busy = false;

  S.finalReceived = false;


  /* =========================
     VOICE OUTPUT
  ========================= */

  state(
    "SPEAKING",
    "ORRERY IS SPEAKING"
  );

  speak(answer);
}


/* =========================
   SPEECH RECOGNITION
========================= */

function setupSpeech() {

  const Recognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!Recognition) {

    state(
      "STANDBY",
      "このiPhoneでは音声認識を利用できません"
    );

    return null;
  }

  const recognition =
    new Recognition();

  recognition.lang = "ja-JP";

  recognition.continuous = false;

  recognition.interimResults = true;

  recognition.maxAlternatives = 3;


  /* =========================
     START
  ========================= */

  recognition.onstart = () => {

    S.listening = true;
    S.finalReceived = false;

    $("#mic")
      ?.classList
      .add("active");

    state(
      "LISTENING",
      "お話しください"
    );

    preview(
      "聞き取っています…"
    );

    visual();
  };


  /* =========================
     RESULT
  ========================= */

  recognition.onresult = event => {

    let text = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {

      const result =
        event.results[i];

      if (result?.[0]) {

        text += result[0].transcript;
      }
    }

    text = text.trim();

    if (!text) {
      return;
    }

    preview(text);

    /*
     * 最後の結果が確定した場合
     */
    const lastResult =
      event.results[
        event.results.length - 1
      ];

    if (
      lastResult &&
      lastResult.isFinal
    ) {

      S.finalReceived = true;

      const finalText = text;

      state(
        "PROCESSING",
        "ORRERY IS THINKING"
      );

      /*
       * iPhone Safariで
       * recognition.onend と ask() が
       * 競合しないよう少し待つ。
       */
      setTimeout(() => {

        ask(finalText);

      }, 180);
    }
  };


  /* =========================
     ERROR
  ========================= */

  recognition.onerror = event => {

    console.warn(
      "ORRERY Speech Error:",
      event.error
    );

    /*
     * 確定済みなら、
     * iPhone特有の後続エラーとして無視。
     */
    if (S.finalReceived) {
      return;
    }

    S.listening = false;

    $("#mic")
      ?.classList
      .remove("active");

    let message =
      "もう一度話しかけてください。";

    if (event.error === "not-allowed") {

      message =
        "マイクの使用を許可してください。";
    }

    if (event.error === "network") {

      message =
        "音声認識の通信を確認してください。";
    }

    if (event.error === "no-speech") {

      message =
        "聞き取れませんでした。";
    }

    if (event.error === "aborted") {

      message =
        "音声認識を停止しました。";
    }

    state(
      "STANDBY",
      message
    );

    preview(message);
  };


  /* =========================
     END
  ========================= */

  recognition.onend = () => {

    S.listening = false;

    $("#mic")
      ?.classList
      .remove("active");

    /*
     * 確定済みならask()側で処理中。
     * ここではSTANDBYに戻さない。
     */
    if (
      !S.finalReceived &&
      !S.busy
    ) {

      state(
        "STANDBY",
        "「オレリー」と話しかけてください"
      );
    }
  };


  return recognition;
}


S.rec = setupSpeech();


/* =========================
   START MICROPHONE
========================= */

function startListening() {

  unlockSpeech();

  if (!S.rec) {

    state(
      "STANDBY",
      "音声認識が利用できません"
    );

    return;
  }

  if (S.listening) {

    try {
      S.rec.stop();
    } catch (error) {
      console.warn(
        "Speech stop error:",
        error
      );
    }

    return;
  }

  try {

    S.rec.start();

  } catch (error) {

    console.warn(
      "Speech start error:",
      error
    );

    try {

      S.rec.abort();

      setTimeout(() => {

        try {
          S.rec.start();
        } catch (retryError) {
          console.warn(
            "Speech retry error:",
            retryError
          );
        }

      }, 250);

    } catch (abortError) {

      console.warn(
        "Speech abort error:",
        abortError
      );
    }
  }
}


/* =========================
   VISUALIZER
========================= */

function visual() {

  if (S.visualStarted) {
    return;
  }

  S.visualStarted = true;

  const canvas = $("#viz");

  if (!canvas) {
    return;
  }

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    return;
  }


  function resize() {

    const dpr =
      Math.max(
        1,
        window.devicePixelRatio || 1
      );

    canvas.width =
      canvas.clientWidth * dpr;

    canvas.height =
      canvas.clientHeight * dpr;
  }

  resize();

  window.addEventListener(
    "resize",
    resize
  );


  function draw() {

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    ctx.beginPath();

    ctx.strokeStyle =
      "#5ceaff";

    ctx.lineWidth =
      2 *
      (window.devicePixelRatio || 1);

    const active =
      S.listening ||
      (
        "speechSynthesis" in window &&
        speechSynthesis.speaking
      );

    for (
      let p = 0;
      p < width;
      p += 4
    ) {

      const y =
        height / 2 +
        (
          active
            ? (
                Math.sin(
                  p / 16 +
                  Date.now() / 80
                ) * 14 +
                Math.sin(
                  p / 6 +
                  Date.now() / 130
                ) * 5
              )
            : Math.sin(
                p / 28 +
                Date.now() / 500
              ) * 2
        );

      if (p) {
        ctx.lineTo(p, y);
      } else {
        ctx.moveTo(p, y);
      }
    }

    ctx.stroke();


    const core = $("#core");

    if (core) {

      core.style.transform =
        active
          ? `scale(${
              1 +
              Math.sin(
                Date.now() / 100
              ) * 0.018
            })`
          : "scale(1)";
    }

    requestAnimationFrame(draw);
  }

  draw();
}


/* =========================
   BUTTONS
========================= */

$("#mic")?.addEventListener(
  "click",
  startListening
);


/* =========================
   SEND BUTTON
========================= */

$("#send")?.addEventListener(
  "click",
  () => {

    const text =
      $("#preview")
        ?.textContent
        .trim() || "";

    if (
      !text ||
      text ===
        "オレリーに話しかけてください" ||
      text.includes(
        "聞き取っています"
      )
    ) {
      return;
    }

    unlockSpeech();

    ask(text);
  }
);


/* =========================
   QUICK COMMANDS
========================= */

document
  .querySelectorAll(".quick button")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const prompt =
          button.dataset.prompt;

        if (prompt) {
          ask(prompt);
        }
      }
    );
  });


/* =========================
   AI LINK SETTINGS
========================= */

$("#config")?.addEventListener(
  "click",
  () => {

    const endpoint =
      $("#endpoint");

    if (endpoint) {
      endpoint.value = S.endpoint;
    }

    const settings =
      $("#settings");

    if (settings) {
      settings.showModal();
    }
  }
);


/* =========================
   CLOSE SETTINGS
========================= */

$("#close")?.addEventListener(
  "click",
  () => {

    const settings =
      $("#settings");

    if (settings) {
      settings.close();
    }
  }
);


/* =========================
   SAVE SETTINGS
========================= */

$("#save")?.addEventListener(
  "click",
  () => {

    const endpoint =
      $("#endpoint");

    if (!endpoint) {
      return;
    }

    S.endpoint =
      endpoint.value.trim();

    localStorage.setItem(
      "orreryEndpoint",
      S.endpoint
    );

    if ($("#aiLink")) {

      $("#aiLink").textContent =
        S.endpoint
          ? "SECURE"
          : "LOCAL";
    }

    const settings =
      $("#settings");

    if (settings) {
      settings.close();
    }

    msg(
      "ai",
      S.endpoint
        ? "AIセキュアリンクを設定しました。"
        : "ローカルモードに戻しました。"
    );
  }
);


/* =========================
   LOAD SAVED ENDPOINT
========================= */

const savedEndpoint =
  localStorage.getItem(
    "orreryEndpoint"
  );

if (savedEndpoint) {

  S.endpoint =
    savedEndpoint.trim();
}


/* =========================
   RESET
========================= */

$("#clear")?.addEventListener(
  "click",
  () => {

    S.history = [];

    if ($("#messages")) {
      $("#messages").innerHTML = "";
    }

    msg(
      "ai",
      "セッションをリセットしました。システムオンライン。"
    );

    preview(
      "オレリーに話しかけてください"
    );
  }
);


/* =========================
   NETWORK
========================= */

function updateNetwork() {

  if ($("#network")) {

    $("#network").textContent =
      navigator.onLine
        ? "ONLINE"
        : "OFFLINE";
  }
}

updateNetwork();

window.addEventListener(
  "online",
  updateNetwork
);

window.addEventListener(
  "offline",
  updateNetwork
);


/* =========================
   VOICES
========================= */

if (
  "speechSynthesis" in window
) {

  speechSynthesis.onvoiceschanged =
    () => {
      japaneseVoice();
    };
}


/* =========================
   INIT
========================= */

if (
  S.endpoint &&
  $("#aiLink")
) {

  $("#aiLink").textContent =
    "SECURE";
} else if ($("#aiLink")) {

  $("#aiLink").textContent =
    "LOCAL";
}

state(
  "STANDBY",
  "「オレリー」と話しかけてください"
);

visual();
