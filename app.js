const $ = s => document.querySelector(s);

const S = {
    endpoint: "https://orrery-ai.akanatsu0516.workers.dev",
  rec: null,
  listening: false,
  busy: false,
  visualStarted: false,
  history: [],
  speechUnlocked: false
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
    date.textContent = d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric"
    }).toUpperCase();
  }
}

setInterval(tick, 300);
tick();


/* =========================
   WEATHER
========================= */
async function weather() {
  try {
    const r = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=33.5902&longitude=130.4017&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FTokyo"
    );

    const j = await r.json();

    const c = j.current.weather_code;
    const t = Math.round(j.current.temperature_2m);

    const icon =
      c === 0 ? "☼" :
      c < 60 ? "☁" :
      "◌";

    const desc =
      c === 0 ? "CLEAR" :
      c < 60 ? "CLOUDY" :
      "PRECIP";

    if ($("#temp")) $("#temp").textContent = `${t}°`;
    if ($("#weatherIcon")) $("#weatherIcon").textContent = icon;
    if ($("#weatherText")) $("#weatherText").textContent = desc;

    if ($("#wTemp")) $("#wTemp").textContent = `${t}°`;
    if ($("#wDesc")) $("#wDesc").textContent = desc;
    if ($("#humidity")) {
      $("#humidity").textContent =
        `${j.current.relative_humidity_2m}%`;
    }

  } catch (e) {
    if ($("#weatherText")) $("#weatherText").textContent = "OFFLINE";
    if ($("#wDesc")) $("#wDesc").textContent = "OFFLINE";
  }
}

weather();


/* =========================
   SYSTEM STATE
========================= */
function state(main, sub) {

  if ($("#listenLabel"))
    $("#listenLabel").textContent = main;

  if ($("#subLabel"))
    $("#subLabel").textContent = sub;

  if ($("#mode"))
    $("#mode").textContent = main;

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

  if ($("#activityText"))
    $("#activityText").textContent = main;
}


/* =========================
   CHAT DISPLAY
========================= */
function msg(who, text) {

  const box = $("#messages");

  if (!box) return;

  const e = document.createElement("div");

  e.className = `msg ${who}`;

  e.innerHTML =
    `<b>${who === "ai" ? "O" : "Y"}</b>` +
    `<div>` +
    `<small>${who === "ai" ? "ORRERY" : "YOU"}</small>` +
    `<p></p>` +
    `</div>`;

  e.querySelector("p").textContent = text;

  box.appendChild(e);

  box.scrollTop = box.scrollHeight;
}


/* =========================
   PREVIEW
========================= */
function preview(text) {

  const el = $("#preview");

  if (el)
    el.textContent = text;
}


/* =========================
   IOS SPEECH UNLOCK
========================= */
function unlockSpeech() {

  if (
    !("speechSynthesis" in window) ||
    S.speechUnlocked
  ) return;

  try {

    speechSynthesis.cancel();

    const u =
      new SpeechSynthesisUtterance("");

    u.lang = "ja-JP";
    u.volume = 0;

    speechSynthesis.speak(u);

    S.speechUnlocked = true;

  } catch (e) {}
}


/* =========================
   JAPANESE VOICE
========================= */
function japaneseVoice() {

  if (!("speechSynthesis" in window))
    return null;

  const voices =
    speechSynthesis.getVoices();

  return (
    voices.find(v =>
      /^ja(-|_)/i.test(v.lang)
    ) ||
    voices.find(v =>
      /japanese|日本語/i.test(v.name)
    ) ||
    null
  );
}


/* =========================
   SPEAK
========================= */
function speak(text) {

  if (
    !("speechSynthesis" in window) ||
    !text
  ) return;

  speechSynthesis.cancel();

  const u =
    new SpeechSynthesisUtterance(text);

  u.lang = "ja-JP";
  u.rate = 0.98;
  u.pitch = 1;
  u.volume = 1;

  const voice = japaneseVoice();

  if (voice)
    u.voice = voice;

  u.onstart = () => {
    state(
      "SPEAKING",
      "AI VOICE OUTPUT"
    );
  };

  u.onend = () => {
    state(
      "STANDBY",
      "「オレリー」と話しかけてください"
    );
  };

  u.onerror = () => {
    state(
      "STANDBY",
      "音声出力を確認してください"
    );
  };

  speechSynthesis.speak(u);
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

  if (/こんにちは|こんばんは|おはよう/.test(text)) {

    return "こんにちは。ORRERYはオンラインです。";
  }

  if (/ありがとう|ありがと/.test(text)) {

    return "どういたしまして。いつでも話しかけてください。";
  }

  if (/元気|調子/.test(text)) {

    return "システムは正常です。いつでも話しかけてください。";
  }

  return "現在はローカル会話モードです。AIバックエンドを接続すると、自由に会話できます。";
}


/* =========================
   AI REQUEST
========================= */
async function ask(text) {

  const t = String(text || "").trim();

  if (!t || S.busy)
    return;

  S.busy = true;

  preview(t);

  msg("user", t);

  state(
    "PROCESSING",
    "ORRERY AI IS THINKING"
  );

  let answer = "";

  try {

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
              message: t,
              history:
                S.history.slice(-12)
            })
          }
        );

      if (!response.ok)
        throw new Error(
          `HTTP ${response.status}`
        );

      const data =
        await response.json();

      answer =
        data.reply ||
        data.output ||
        data.message ||
        data.output_text ||
        "";

      if (!answer)
        throw new Error(
          "EMPTY_RESPONSE"
        );

    } else {

      answer = localAI(t);

    }

  } catch (e) {

    console.error(
      "ORRERY AI ERROR",
      e
    );

    answer =
      "AIリンクに接続できませんでした。LINK設定のURLを確認してください。";
  }

  S.history.push({
    role: "user",
    content: t
  });

  S.history.push({
    role: "assistant",
    content: answer
  });

  /* AIの返答を必ず画面に表示 */
  msg("ai", answer);

  /* 表示バグ修正 */
  preview(answer);

  S.busy = false;

  /* AIの返答を音声出力 */
  unlockSpeech();

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

  const r =
    new Recognition();

  r.lang = "ja-JP";

  r.continuous = false;

  r.interimResults = true;

  r.maxAlternatives = 3;


  /* START */

  r.onstart = () => {

    S.listening = true;

    $("#mic")?.classList.add("active");

    state(
      "LISTENING",
      "お話しください"
    );

    preview(
      "聞き取っています…"
    );

    visual();
  };


  /* RESULT */

  r.onresult = e => {

    let interim = "";

    let finalText = "";

    for (
      let i = e.resultIndex;
      i < e.results.length;
      i++
    ) {

      const result =
        e.results[i];

      const transcript =
        result[0]?.transcript || "";

      if (result.isFinal) {

        finalText += transcript;

      } else {

        interim += transcript;
      }
    }


    /* 認識途中 */

    if (interim) {

      preview(interim);
    }


    /* 認識確定 */

    if (finalText.trim()) {

      const clean =
        finalText.trim();

      preview(clean);

      setTimeout(
        () => ask(clean),
        100
      );
    }
  };


  /* ERROR */

  r.onerror = e => {

    console.warn(
      "SpeechRecognition:",
      e.error
    );

    S.listening = false;

    $("#mic")
      ?.classList
      .remove("active");

    let message =
      "音声認識を確認してください。";

    if (e.error === "not-allowed") {

      message =
        "マイクの使用を許可してください。";
    }

    if (e.error === "no-speech") {

      message =
        "聞き取れませんでした。もう一度話してください。";
    }

    if (e.error === "network") {

      message =
        "音声認識の通信を確認してください。";
    }

    state(
      "STANDBY",
      message
    );

    preview(message);
  };


  /* END */

  r.onend = () => {

    S.listening = false;

    $("#mic")
      ?.classList
      .remove("active");

    if (!S.busy) {

      state(
        "STANDBY",
        "「オレリー」と話しかけてください"
      );
    }
  };


  return r;
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
    } catch (e) {}

    return;
  }

  try {

    S.rec.start();

  } catch (e) {

    console.warn(
      "Speech start error:",
      e
    );

    try {

      S.rec.abort();

      setTimeout(
        () => S.rec.start(),
        250
      );

    } catch (e2) {}
  }
}


/* =========================
   VISUALIZER
========================= */
function visual() {

  if (S.visualStarted)
    return;

  S.visualStarted = true;

  const canvas = $("#viz");

  if (!canvas)
    return;

  const ctx =
    canvas.getContext("2d");


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

  addEventListener(
    "resize",
    resize
  );


  function draw() {

    const w = canvas.width;

    const h = canvas.height;

    ctx.clearRect(
      0,
      0,
      w,
      h
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
      p < w;
      p += 4
    ) {

      const y =
        h / 2 +
        (
          active
            ? Math.sin(
                p / 16 +
                Date.now() / 80
              ) * 14 +
              Math.sin(
                p / 6 +
                Date.now() / 130
              ) * 5
            : Math.sin(
                p / 28 +
                Date.now() / 500
              ) * 2
        );

      if (p)
        ctx.lineTo(p, y);
      else
        ctx.moveTo(p, y);
    }

    ctx.stroke();


    const core =
      $("#core");

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


$("#send")?.addEventListener(
  "click",
  () => {

    const text =
      $("#preview")
        ?.textContent
        .trim() || "";

    if (
      text &&
      text !==
        "オレリーに話しかけてください" &&
      !text.includes(
        "聞き取っています"
      )
    ) {

      unlockSpeech();

      ask(text);
    }
  }
);


/* QUICK COMMANDS */

document
  .querySelectorAll(".quick button")
  .forEach(button => {

    button.addEventListener(
      "click",
      () =>
        ask(
          button.dataset.prompt
        )
    );
  });


/* =========================
   AI LINK SETTINGS
========================= */

$("#config")?.addEventListener(
  "click",
  () => {

    $("#endpoint").value =
      S.endpoint;

    $("#settings").showModal();
  }
);


$("#close")?.addEventListener(
  "click",
  () =>
    $("#settings").close()
);


$("#save")?.addEventListener(
  "click",
  () => {

    S.endpoint =
      $("#endpoint")
        .value
        .trim();

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

    $("#settings").close();

    msg(
      "ai",
      S.endpoint
        ? "AIセキュアリンクを設定しました。"
        : "ローカルモードに戻しました。"
    );
  }
);


/* =========================
   RESET
========================= */

$("#clear")?.addEventListener(
  "click",
  () => {

    S.history = [];

    if ($("#messages"))
      $("#messages").innerHTML = "";

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

if ($("#network")) {

  $("#network").textContent =
    navigator.onLine
      ? "ONLINE"
      : "OFFLINE";
}

addEventListener(
  "online",
  () => {

    if ($("#network"))
      $("#network").textContent =
        "ONLINE";
  }
);

addEventListener(
  "offline",
  () => {

    if ($("#network"))
      $("#network").textContent =
        "OFFLINE";
  }
);


/* =========================
   VOICES
========================= */

if (
  "speechSynthesis" in window
) {

  speechSynthesis.onvoiceschanged =
    () => {};
}


/* =========================
   INIT
========================= */

if (S.endpoint && $("#aiLink")) {

  $("#aiLink").textContent =
    "SECURE";
}

state(
  "STANDBY",
  "「オレリー」と話しかけてください"
);

visual();
/* =========================
   ORRERY V4.2 VOICE FIX
   ========================= */

S.finalReceived = false;
S.lastSpeechText = "";

/* 音声認識をiPhone向けに再構成 */
if (S.rec) {

  S.rec.onstart = () => {

    S.listening = true;
    S.finalReceived = false;

    $("#mic")?.classList.add("active");

    state(
      "LISTENING",
      "お話しください"
    );

    preview("聞き取っています…");
  };


  S.rec.onresult = event => {

    let text = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {

      const result = event.results[i];

      if (result[0]) {
        text += result[0].transcript;
      }
    }

    text = text.trim();

    if (!text) return;

    preview(text);

    const last =
      event.results[event.results.length - 1];

    if (last && last.isFinal) {

      S.finalReceived = true;

      const finalText = text;

      state(
        "PROCESSING",
        "ORRERY IS THINKING"
      );

      /* 認識終了処理と競合しないよう少し待つ */
      setTimeout(() => {

        ask(finalText);

      }, 180);
    }
  };


  S.rec.onerror = event => {

    console.log(
      "ORRERY Speech Error:",
      event.error
    );

    /*
      iPhoneでは正常認識後に
      aborted / no-speech が発生することがある。
      確定済みならエラー扱いしない。
    */
    if (S.finalReceived) {
      return;
    }

    S.listening = false;

    $("#mic")
      ?.classList
      .remove("active");

    let text =
      "もう一度話しかけてください。";

    if (event.error === "not-allowed") {
      text =
        "マイクの使用を許可してください。";
    }

    if (event.error === "network") {
      text =
        "音声認識の通信を確認してください。";
    }

    if (event.error === "no-speech") {
      text =
        "聞き取れませんでした。";
    }

    state(
      "STANDBY",
      text
    );

    preview(text);
  };


  S.rec.onend = () => {

    S.listening = false;

    $("#mic")
      ?.classList
      .remove("active");

    /*
      認識確定後はask()側に任せる。
      ここでSTANDBYに戻して返答表示を
      上書きしない。
    */
    if (!S.finalReceived && !S.busy) {

      state(
        "STANDBY",
        "「オレリー」と話しかけてください"
      );
    }
  };
}


/* =========================
   V4.2 RESPONSE
   ========================= */

ask = async function(text) {

  const t = String(text || "").trim();

  if (!t || S.busy) return;

  S.busy = true;

  preview(t);

  state(
    "PROCESSING",
    "ORRERY IS THINKING"
  );

  let answer = "";

  try {

    /*
      まずローカル応答で確実にテスト。
      AI Endpointが設定されていればそちらを使用。
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
              message: t,
              history:
                S.history.slice(-12)
            })
          }
        );

      if (!response.ok) {
        throw new Error(
          "HTTP " + response.status
        );
      }

      const data =
        await response.json();

      answer =
        data.reply ||
        data.output ||
        data.message ||
        "";

      if (!answer) {
        throw new Error(
          "EMPTY_RESPONSE"
        );
      }

    } else {

      /* AI未接続でも必ず返答 */
      if (
        /こんにちは|こんにちわ/.test(t)
      ) {

        answer =
          "こんにちは。ORRERYはオンラインです。";

      } else if (
        /名前|誰/.test(t)
      ) {

        answer =
          "私はORRERY。あなたのiPhoneで動くAIアシスタントです。";

      } else if (
        /何時|時間/.test(t)
      ) {

        answer =
          "現在時刻は" +
          ($("#clock")?.textContent || "") +
          "です。";

      } else {

        answer =
          "聞こえています。ORRERYは正常に動作しています。";
      }
    }

  } catch (error) {

    console.error(
      "ORRERY RESPONSE ERROR",
      error
    );

    answer =
      "AIとの通信に失敗しました。";
  }


  /* 会話履歴 */

  S.history.push({
    role: "user",
    content: t
  });

  S.history.push({
    role: "assistant",
    content: answer
  });


  /* =========================
     重要：返答を画面に表示
     ========================= */

  msg(
    "user",
    t
  );

  msg(
    "ai",
    answer
  );

  /*
    TALK欄にも返答を表示
  */

  preview(answer);


  /* =========================
     音声出力
     ========================= */

  S.busy = false;

  S.finalReceived = false;

  state(
    "SPEAKING",
    "ORRERY IS SPEAKING"
  );

  speak(answer);
};


/* =========================
   iPhone SPEECH OUTPUT
   ========================= */

speak = function(text) {

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


  speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang =
    "ja-JP";

  utterance.rate =
    0.95;

  utterance.pitch =
    1.0;

  utterance.volume =
    1.0;


  const voices =
    speechSynthesis.getVoices();


  const japanese =
    voices.find(
      voice =>
        voice.lang === "ja-JP"
    ) ||
    voices.find(
      voice =>
        voice.lang.startsWith("ja")
    );


  if (japanese) {
    utterance.voice = japanese;
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

    console.log(
      "Speech synthesis error:",
      error
    );

    state(
      "STANDBY",
      "音声出力を確認してください"
    );
  };


  /*
    iPhone Safari対策
  */
  setTimeout(() => {

    speechSynthesis.speak(
      utterance
    );

  }, 80);
};
/* =========================
   ORRERY V4.2 VOICE FIX
   ========================= */
