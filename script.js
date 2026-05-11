// ============================================================
// MOCK DE DADOS - substitua por APIs reais no futuro
// Uber: https://developer.uber.com
// Onibus Aracaju: SMTT/SE ou integracao GTFS
// Clima: https://openweathermap.org/api
// Transito: https://developers.google.com/maps/documentation/javascript/trafficlayer
// Combustivel: ANP
// ============================================================

const MOCK_USER_LOCATION = {
  lat: -10.9472,
  lng: -37.0731,
  label: "Você está aqui",
  bairro: "Atalaia, Aracaju - SE"
};

const MOCK_VEHICLES = {
  uber: [
    { lat: -10.9460, lng: -37.0750, label: "Uber - 4 min", id: "uber-01" },
    { lat: -10.9490, lng: -37.0710, label: "Uber - 6 min", id: "uber-02" },
    { lat: -10.9445, lng: -37.0780, label: "Uber - 8 min", id: "uber-03" }
  ],
  onibus: [
    { lat: -10.9500, lng: -37.0680, label: "Ônibus 004 - Linha Centro/Atalaia", id: "bus-01", eta: "3 min", lotacao: 88, lotacaoStatus: "Lotado", lotacaoNivel: "lotado" },
    { lat: -10.9420, lng: -37.0800, label: "Ônibus 052 - Linha Salgado Filho", id: "bus-02", eta: "11 min", lotacao: 32, lotacaoStatus: "Tranquilo", lotacaoNivel: "tranquilo" },
    { lat: -10.9468, lng: -37.0645, label: "Ônibus 071 - Linha Farolândia/Jardins", id: "bus-03", eta: "7 min", lotacao: 61, lotacaoStatus: "Moderado", lotacaoNivel: "moderado" }
  ]
};

const MOCK_POI_ARACAJU = [
  { lat: -10.9167, lng: -37.0500, label: "Terminal DIA", type: "terminal" },
  { lat: -10.9306, lng: -37.0600, label: "Shopping Jardins", type: "destino" },
  { lat: -10.9500, lng: -37.0750, label: "Orla de Atalaia", type: "ponto" },
  { lat: -10.9250, lng: -37.0700, label: "Mercado Municipal", type: "ponto" },
  { lat: -10.9389, lng: -37.0556, label: "Rodoviária de Aracaju", type: "terminal" },
  { lat: -10.9100, lng: -37.0556, label: "UFS - Campus São Cristóvão", type: "ponto" },
  { lat: -10.9147, lng: -37.0497, label: "Praça Fausto Cardoso", type: "ponto" },
  { lat: -10.9650, lng: -37.0700, label: "Farolândia", type: "bairro" }
];

const MODAIS = {
  carro: {
    nome: "Carro próprio",
    icon: "car-front",
    tempo: 18,
    custo: 18.5,
    conforto: 4,
    carbono: "Alta",
    acessivel: true
  },
  uber: {
    nome: "Uber/99",
    icon: "car",
    tempo: 16,
    custo: 24.9,
    conforto: 5,
    carbono: "Media",
    acessivel: true
  },
  onibus: {
    nome: "Ônibus",
    icon: "bus",
    tempo: 32,
    custo: 4.5,
    conforto: 3,
    carbono: "Baixa",
    acessivel: true
  },
  bike: {
    nome: "Bike",
    icon: "bike",
    tempo: 26,
    custo: 0,
    conforto: 2,
    carbono: "Zero",
    acessivel: false
  },
  ape: {
    nome: "A pé",
    icon: "footprints",
    tempo: 45,
    custo: 0,
    conforto: 2,
    carbono: "Zero",
    acessivel: false
  }
};

const state = {
  perfil: null,
  destino: "Jardins",
  modalRecomendado: "uber",
  map: null,
  vehicleLayer: null,
  poiLayer: null,
  userLayer: null
};

window.APP_STATE = state;
const STORAGE_KEY = "vaiDeQuePerfil";

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  carregarPerfil();
  navegarPara(state.perfil ? "tela-home" : "tela-onboarding");
  renderIcons();
});

function bindEvents() {
  document.getElementById("perfil-form").addEventListener("submit", salvarPerfil);
  document.querySelector("[data-action='editar-perfil']").addEventListener("click", () => navegarPara("tela-onboarding"));
  document.querySelector("[data-action='voltar-home']").addEventListener("click", () => navegarPara("tela-home"));
  document.querySelector("[data-action='voltar-recomendacao']").addEventListener("click", () => navegarPara("tela-recomendacao"));
  document.querySelector("[data-action='perfil-rapido']").addEventListener("click", alternarPerfilRapido);
  document.querySelector("[data-action='recomendar']").addEventListener("click", gerarRecomendacao);
  document.querySelector("[data-action='abrir-mapa']").addEventListener("click", () => abrirMapa(state.modalRecomendado));
  document.querySelector("[data-action='chamar']").addEventListener("click", chamarTransporte);

  document.querySelectorAll(".toggle-btn").forEach((button) => {
    button.addEventListener("click", () => trocarModal(button.dataset.modal));
  });
}

function carregarPerfil() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  if (!salvo) return;

  state.perfil = JSON.parse(salvo);
  state.perfil.prioridades = normalizarPrioridades(state.perfil);
  state.perfil.modais = (state.perfil.modais || ["uber", "onibus"]).filter((modal) => MODAIS[modal]);
  document.getElementById("nome").value = state.perfil.nome || "";
  document.getElementById("mobilidade").checked = Boolean(state.perfil.mobilidadeReduzida);
  document.querySelectorAll("[name='prioridades']").forEach((input) => {
    input.checked = state.perfil.prioridades.includes(input.value);
  });
  document.querySelectorAll("[name='modais']").forEach((input) => {
    input.checked = state.perfil.modais.includes(input.value);
  });
  aplicarMobilidade();
}

function salvarPerfil(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const modais = form.getAll("modais");

  state.perfil = {
    nome: String(form.get("nome") || "").trim(),
    prioridades: normalizarPrioridades({ prioridades: form.getAll("prioridades") }),
    mobilidadeReduzida: Boolean(form.get("mobilidade")),
    modais: (modais.length ? modais : ["uber", "onibus"]).filter((modal) => MODAIS[modal])
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.perfil));
  aplicarMobilidade();
  navegarPara("tela-home");
}

function aplicarMobilidade() {
  document.body.classList.toggle("reduced-mobility", Boolean(state.perfil?.mobilidadeReduzida));
}

function navegarPara(id) {
  document.querySelectorAll(".tela").forEach((section) => section.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (id === "tela-mapa" && state.map) {
    setTimeout(() => state.map.invalidateSize(), 100);
  }
}

function gerarRecomendacao() {
  const destino = document.getElementById("destino").value.trim();
  state.destino = destino || "Jardins";
  state.modalRecomendado = escolherModal();
  renderRecomendacao();
  navegarPara("tela-recomendacao");
}

function escolherModal() {
  const perfil = state.perfil || { prioridades: ["economia"], modais: ["uber", "onibus"], mobilidadeReduzida: false };
  perfil.prioridades = normalizarPrioridades(perfil);
  const disponiveis = perfil.modais.filter((modal) => MODAIS[modal]);
  const candidatos = disponiveis.length ? disponiveis : ["uber", "onibus"];

  const ordenados = candidatos
    .filter((modal) => !perfil.mobilidadeReduzida || MODAIS[modal].acessivel)
    .sort((a, b) => scoreModal(a, perfil) - scoreModal(b, perfil));

  return ordenados[0] || "uber";
}

function scoreModal(modal, perfil) {
  const item = MODAIS[modal];
  const custoScore = item.custo * 1.8;
  const tempoScore = item.tempo * 1.4;
  const confortoScore = (5 - item.conforto) * 10;
  const prioridades = normalizarPrioridades(perfil);

  if (perfil.mobilidadeReduzida) return tempoScore + confortoScore - (item.acessivel ? 12 : -40);
  const pesos = {
    economia: prioridades.includes("economia") ? 1 : 0.2,
    tempo: prioridades.includes("tempo") ? 1 : 0.2,
    conforto: prioridades.includes("conforto") ? 1 : 0.2
  };

  return (custoScore * pesos.economia) + (tempoScore * pesos.tempo) + (confortoScore * pesos.conforto);
}

function renderRecomendacao() {
  const modal = MODAIS[state.modalRecomendado];
  const perfilNome = state.perfil?.nome ? `${state.perfil.nome}, ` : "";
  const card = document.getElementById("card-destaque");

  card.innerHTML = `
    <span class="badge">Melhor para seu perfil</span>
    <h3>${modal.nome}</h3>
    <p>${perfilNome}para ir de Atalaia a ${state.destino}, ${modal.nome.toLowerCase()} equilibra melhor ${textoPrioridade()} com o momento atual: trânsito moderado, clima aberto e custo estimado de ${formatMoney(modal.custo)}.</p>
    <div class="recommendation-meta">
      <span>${modal.tempo} min</span>
      <span>${formatMoney(modal.custo)}</span>
      <span>${"★".repeat(modal.conforto)}${"☆".repeat(5 - modal.conforto)}</span>
      <span>CO2: ${modal.carbono}</span>
    </div>
  `;

  renderComparacao();
  renderIcons();
}

function textoPrioridade() {
  if (state.perfil?.mobilidadeReduzida) return "acessibilidade, conforto e previsibilidade";
  const prioridades = normalizarPrioridades(state.perfil);
  const textos = {
    economia: "preço baixo",
    tempo: "tempo de chegada",
    conforto: "conforto e segurança"
  };
  return prioridades.map((prioridade) => textos[prioridade]).join(", ");
}

function renderComparacao() {
  const lista = document.getElementById("lista-modais");
  const modais = Object.entries(MODAIS)
    .filter(([id]) => state.perfil?.modais.includes(id) || id === state.modalRecomendado)
    .sort(([a], [b]) => scoreModal(a, state.perfil || {}) - scoreModal(b, state.perfil || {}));

  lista.innerHTML = modais.map(([id, modal]) => `
    <article class="comparison-item ${id === state.modalRecomendado ? "recommended" : ""}">
      <div class="comparison-icon"><i data-lucide="${modal.icon}"></i></div>
      <div class="comparison-main">
        <div class="comparison-title">
          <strong>${modal.nome}</strong>
          ${id === state.modalRecomendado ? '<span class="mini-badge">Melhor para seu perfil</span>' : ""}
        </div>
        <div class="metrics">
          <span>${modal.tempo} min</span>
          <span>${formatMoney(modal.custo)}</span>
          <span>${"★".repeat(modal.conforto)}${"☆".repeat(5 - modal.conforto)}</span>
          <span>CO2 ${modal.carbono}</span>
          ${id === "onibus" ? `<span>${resumoLotacaoOnibus()}</span>` : ""}
        </div>
      </div>
    </article>
  `).join("");
}

function alternarPerfilRapido() {
  state.perfil = state.perfil || { nome: "", prioridades: ["economia"], modais: ["uber", "onibus"], mobilidadeReduzida: false };
  const atuais = normalizarPrioridades(state.perfil);
  state.perfil.prioridades = atuais.length === 3 ? ["economia"] : ["economia", "tempo", "conforto"];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.perfil));
  state.modalRecomendado = escolherModal();
  renderRecomendacao();
}

function normalizarPrioridades(perfil) {
  const validas = ["economia", "tempo", "conforto"];
  const origem = Array.isArray(perfil?.prioridades) ? perfil.prioridades : [perfil?.prioridade || "economia"];
  const prioridades = origem.filter((item, index) => validas.includes(item) && origem.indexOf(item) === index);
  return prioridades.length ? prioridades : ["economia"];
}

function abrirMapa(modalSelecionado) {
  const modalMapa = modalSelecionado === "onibus" ? "onibus" : "uber";
  state.modalRecomendado = modalMapa;
  navegarPara("tela-mapa");

  setTimeout(() => {
    if (!state.map) initMapLeaflet();
    trocarModal(modalMapa);
    state.map.invalidateSize();
  }, 120);
}

function initMapLeaflet() {
  state.map = L.map("mapa-container", {
    zoomControl: true,
    scrollWheelZoom: false
  }).setView([MOCK_USER_LOCATION.lat, MOCK_USER_LOCATION.lng], 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(state.map);

  state.userLayer = L.layerGroup().addTo(state.map);
  state.vehicleLayer = L.layerGroup().addTo(state.map);
  state.poiLayer = L.layerGroup().addTo(state.map);

  renderUserMarkerLeaflet();
  renderPOIsLeaflet();
}

function renderUserMarkerLeaflet() {
  state.userLayer.clearLayers();
  L.marker([MOCK_USER_LOCATION.lat, MOCK_USER_LOCATION.lng], {
    icon: L.divIcon({
      className: "",
      html: '<div class="user-pulse" aria-hidden="true"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    }),
    title: MOCK_USER_LOCATION.label
  })
    .addTo(state.userLayer)
    .bindPopup(`<strong>Você está aqui</strong><br>${MOCK_USER_LOCATION.bairro}`);
}

function renderVehicleMarkersLeaflet(modal) {
  state.vehicleLayer.clearLayers();
  const veiculos = MOCK_VEHICLES[modal] || MOCK_VEHICLES.uber;
  const color = modal === "uber" ? "#ff6b35" : "#0984e3";
  const iconName = modal === "uber" ? "car" : "bus";

  veiculos.forEach((veiculo) => {
    L.marker([veiculo.lat, veiculo.lng], {
      icon: L.divIcon({
        className: "",
        html: `<div class="vehicle-pin ${modal} ${veiculo.lotacaoNivel || ""}"><i data-lucide="${iconName}" aria-hidden="true"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      }),
      title: veiculo.label
    })
      .addTo(state.vehicleLayer)
      .bindPopup(popupVeiculo(modal, veiculo));

    L.polyline(
      [[MOCK_USER_LOCATION.lat, MOCK_USER_LOCATION.lng], [veiculo.lat, veiculo.lng]],
      { color, dashArray: "7 7", opacity: 0.68, weight: 3 }
    ).addTo(state.vehicleLayer);
  });

  renderIcons();
}

function renderPOIsLeaflet() {
  MOCK_POI_ARACAJU.forEach((poi) => {
    L.circle([poi.lat, poi.lng], {
      radius: poi.type === "terminal" ? 95 : 65,
      color: poi.type === "terminal" ? "#6c5ce7" : "#636e72",
      fillColor: poi.type === "terminal" ? "#6c5ce7" : "#636e72",
      fillOpacity: 0.14,
      weight: 1
    }).addTo(state.poiLayer);

    L.marker([poi.lat, poi.lng], {
      icon: L.divIcon({
        className: "",
        html: `<div class="poi-pin ${poi.type === "terminal" ? "terminal" : ""}" aria-hidden="true"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      }),
      title: poi.label
    })
      .addTo(state.poiLayer)
      .bindPopup(`<strong>${poi.label}</strong><br>${tipoPoi(poi.type)}`);
  });
}

function trocarModal(modal) {
  document.querySelectorAll(".toggle-btn").forEach((button) => {
    const ativo = button.dataset.modal === modal;
    button.classList.toggle("ativo", ativo);
    button.setAttribute("aria-pressed", String(ativo));
  });

  if (state.map) renderVehicleMarkersLeaflet(modal);
  atualizarCardProximo(modal);
  renderLotacaoOnibus(modal);
  state.modalRecomendado = modal;
}

function atualizarCardProximo(modal) {
  const veiculos = MOCK_VEHICLES[modal] || MOCK_VEHICLES.uber;
  const proximo = veiculos[0];
  const eta = proximo.eta || proximo.label.split("-")[1]?.trim() || "a caminho";

  document.querySelector("#card-proximo .card-icon").textContent = modal === "uber" ? "🚗" : "🚌";
  document.getElementById("label-proximo").textContent = modal === "uber" ? "Uber mais próximo" : proximo.label.split("-")[0].trim();
  document.getElementById("eta-proximo").textContent =
    modal === "onibus"
      ? `Chegada estimada: ${eta} | Lotação: ${proximo.lotacaoStatus} (${proximo.lotacao}%)`
      : `Chegada estimada: ${eta}`;
}

function chamarTransporte() {
  alert("Em breve: integração com Uber e app de ônibus de Aracaju.");
}

function popupVeiculo(modal, veiculo) {
  const eta = veiculo.eta || veiculo.label.split("-")[1]?.trim() || "a caminho";
  const nome = modal === "uber" ? "Motorista disponível" : veiculo.label.split("-")[0].trim();
  const detalhe = modal === "uber" ? "Carro parceiro simulado" : veiculo.label.split("-")[1]?.trim() || "Linha local";
  const lotacao = modal === "onibus"
    ? `<br>Lotação: <b>${veiculo.lotacaoStatus} (${veiculo.lotacao}%)</b>`
    : "";
  return `<strong>${nome}</strong><br>Chegada estimada: <b>${eta}</b>${lotacao}<br><small>${detalhe}</small>`;
}

function renderLotacaoOnibus(modal) {
  const painel = document.getElementById("lotacao-onibus");
  const lista = document.getElementById("lista-lotacao");
  const mostrar = modal === "onibus";

  painel.classList.toggle("hidden", !mostrar);
  if (!mostrar) return;

  const ordenados = [...MOCK_VEHICLES.onibus].sort((a, b) => a.lotacao - b.lotacao);
  const menosLotado = ordenados[0];
  const maisLotado = ordenados[ordenados.length - 1];

  lista.innerHTML = ordenados.map((veiculo) => {
    const nome = veiculo.label.split("-")[0].trim();
    const destaque =
      veiculo.id === menosLotado.id ? "Menos lotado" :
      veiculo.id === maisLotado.id ? "Mais lotado" :
      veiculo.lotacaoStatus;

    return `
      <article class="occupancy-item">
        <div class="occupancy-head">
          <strong>${nome}</strong>
          <span class="occupancy-badge ${veiculo.lotacaoNivel}">${destaque}</span>
        </div>
        <div class="occupancy-bar" aria-label="Lotação ${veiculo.lotacao}%">
          <div class="occupancy-fill ${veiculo.lotacaoNivel}" style="width:${veiculo.lotacao}%"></div>
        </div>
        <span class="occupancy-meta">${veiculo.lotacao}% ocupado | Chega em ${veiculo.eta} | ${veiculo.lotacaoStatus}</span>
      </article>
    `;
  }).join("");
}

function resumoLotacaoOnibus() {
  const ordenados = [...MOCK_VEHICLES.onibus].sort((a, b) => a.lotacao - b.lotacao);
  const tranquilo = ordenados[0].label.split("-")[0].trim();
  const lotado = ordenados[ordenados.length - 1].label.split("-")[0].trim();
  return `${tranquilo} mais vazio; ${lotado} mais lotado`;
}

function tipoPoi(type) {
  if (type === "terminal") return "Terminal de integração";
  if (type === "bairro") return "Bairro de referência";
  if (type === "destino") return "Destino frequente";
  return "Ponto de interesse";
}

function formatMoney(value) {
  return value === 0 ? "R$ 0" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
