console.log('App.js carregado!');

const EMPRESAS = ["Vieira", "Prado", "2A", "M2", "VMC", "3P", "GBR"];
const STORAGE_KEY = "bm-dashboard-local-v1";
let bmRegistros = [];

function carregarDados() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            bmRegistros = JSON.parse(stored);
        } catch (e) { }
    }
}

function salvarDados() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bmRegistros));
}

function preencherSelectEmpresas() {
    const filterEmpresa = document.getElementById("filterEmpresa");
    const inputEmpresa = document.getElementById("inputEmpresa");
    if (!filterEmpresa || !inputEmpresa) return;
    EMPRESAS.forEach(emp => {
        filterEmpresa.appendChild(new Option(emp, emp));
        inputEmpresa.appendChild(new Option(emp, emp));
    });
}

function statusToBadge(status) {
    const map = {
        aprovado: { text: "Aprovado", class: "badge badge-aprovado" },
        analise: { text: "Em análise", class: "badge badge-analise" },
        banido: { text: "Banido", class: "badge badge-banido" },
        congelado: { text: "Site congelado", class: "badge badge-congelado" }
    };
    return map[status] || { text: status, class: "badge" };
}

function formatDateBr(isoDate) {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function aplicarFiltros() {
    const fDate = document.getElementById("filterDate").value;
    const fEmpresa = document.getElementById("filterEmpresa").value;
    const fStatus = document.getElementById("filterStatus").value;
    return bmRegistros.filter(r => {
        let ok = true;
        if (fDate) ok = ok && r.data === fDate;
        if (fEmpresa) ok = ok && r.empresa === fEmpresa;
        if (fStatus) ok = ok && r.status === fStatus;
        return ok;
    });
}

function atualizarResumo(lista) {
    const total = lista.length;
    let aprovados = 0, analise = 0, banidos = 0, congelados = 0;
    lista.forEach(r => {
        if (r.status === "aprovado") aprovados++;
        else if (r.status === "analise") analise++;
        else if (r.status === "banido") banidos++;
        else if (r.status === "congelado") congelados++;
    });
    const summary = document.getElementById("summaryCards");
    if (!summary) return;
    summary.innerHTML = "";
    [
        { label: "Total BM's", value: total, sub: "Registros nesta visualização" },
        { label: "Aprovadas", value: aprovados, sub: "Status Aprovado" },
        { label: "Em análise", value: analise, sub: "Aguardando retorno" },
        { label: "Banidas / Congeladas", value: banidos + congelados, sub: "Problemas / Sites" }
    ].forEach(info => {
        const div = document.createElement("div");
        div.className = "summary-card";
        div.innerHTML = `<div class="summary-title">${info.label}</div><div class="summary-value">${info.value}</div><div class="summary-sub">${info.sub}</div>`;
        summary.appendChild(div);
    });
}

function renderTabela() {
    const lista = aplicarFiltros().sort((a, b) => b.data.localeCompare(a.data));
    const tbody = document.getElementById("tableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (lista.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="6" class="no-data">Nenhum registro encontrado. Cadastre as BM's no painel ao lado.</td>`;
        tbody.appendChild(tr);
    } else {
        lista.forEach(r => {
            const badge = statusToBadge(r.status);
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${formatDateBr(r.data)}</td><td><span class="tag-empresa">${r.empresa}</span></td><td><div><strong>${r.facebook || "-"}</strong></div><div style="font-size:0.7rem;color:#6b7280;">${r.portfolio || ""}</div></td><td><span class="${badge.class}">${badge.text}</span></td><td style="max-width:220px; font-size:0.75rem;">${r.obs || ""}</td><td style="text-align:center;"><button class="btn-delete" data-id="${r.id}" title="Excluir registro" style="background:none;border:none;cursor:pointer;padding:4px 8px;transition:opacity 0.2s;"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334Z" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></td>`;
            tbody.appendChild(tr);
        });
    }
    atualizarResumo(lista);
    setTimeout(() => {
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function () {
                excluirRegistro(this.getAttribute('data-id'));
            });
        });
    }, 100);
}

function excluirRegistro(id) {
    console.log('excluirRegistro chamado! ID:', id);
    const modal = document.getElementById('confirmModal');
    const btnConfirmar = document.getElementById('modalConfirmar');
    const btnCancelar = document.getElementById('modalCancelar');

    if (!modal || !btnConfirmar || !btnCancelar) {
        console.error('Modal elements not found');
        return;
    }

    modal.classList.add('active');

    // Reset handlers
    btnConfirmar.onclick = null;
    btnCancelar.onclick = null;

    btnCancelar.onclick = () => modal.classList.remove('active');

    btnConfirmar.onclick = () => {
        console.log('Confirmar clicado!');
        // Use loose equality (==) to match string/number IDs
        const registro = bmRegistros.find(r => r.id == id);
        console.log('Registro encontrado:', registro);

        if (registro) {
            const payload = {
                id: registro.id,
                empresa: registro.empresa,
                nome: registro.facebook // Sending facebook as nome as requested
            };

            console.log('Enviando POST:', payload);

            fetch('https://webhook.sistemavieira.com.br/webhook/delete-bms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(r => console.log('Response:', r.status))
                .catch(e => console.log('Erro:', e));

            bmRegistros = bmRegistros.filter(r => r.id != id);
            salvarDados();
            renderTabela();
        } else {
            console.error('Registro não encontrado para ID:', id);
        }
        modal.classList.remove('active');
    };

    modal.onclick = e => { if (e.target === modal) modal.classList.remove('active'); };
}

function limparFiltros() {
    document.getElementById("filterDate").value = "";
    document.getElementById("filterEmpresa").value = "";
    document.getElementById("filterStatus").value = "";
    renderTabela();
}

function salvarRegistro() {
    const data = document.getElementById("inputDate").value;
    const empresa = document.getElementById("inputEmpresa").value;
    const facebook = document.getElementById("inputFacebook").value.trim();
    const portfolio = document.getElementById("inputPortfolio").value.trim();
    const status = document.getElementById("inputStatus").value;
    const obs = document.getElementById("inputObs").value.trim();

    if (!data || !empresa || (!facebook && !portfolio)) {
        alert("Preencha pelo menos Data, Empresa e Facebook/BM.");
        return;
    }

    const key = empresa + "::" + facebook.toLowerCase() + "::" + portfolio.toLowerCase();
    let encontrado = false;

    bmRegistros = bmRegistros.map(r => {
        const rKey = r.empresa + "::" + (r.facebook || "").toLowerCase() + "::" + (r.portfolio || "").toLowerCase();
        if (rKey === key) {
            encontrado = true;
            return { ...r, data, status, obs };
        }
        return r;
    });

    if (!encontrado) {
        bmRegistros.push({
            id: String(Date.now()) + Math.random().toString(16).slice(2),
            data, empresa, facebook, portfolio, status, obs
        });
    }

    salvarDados();
    renderTabela();

    fetch('https://webhook.sistemavieira.com.br/webhook/save-bms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, empresa, facebook, portfolio, status, obs })
    })
        .then(() => carregarDadosDaApi())
        .catch(() => { });

    document.getElementById("inputFacebook").value = "";
    document.getElementById("inputPortfolio").value = "";
    document.getElementById("inputObs").value = "";
}

function limparTodosDados() {
    if (!confirm("Tem certeza que deseja apagar TODOS os registros deste painel neste navegador?")) return;
    bmRegistros = [];
    salvarDados();
    renderTabela();
}

function carregarDadosDaApi() {
    console.log('Carregando dados da API...');
    fetch('https://webhook.sistemavieira.com.br/webhook/get-bms')
        .then(r => r.json())
        .then(data => {
            console.log('Dados recebidos:', data);
            if (Array.isArray(data)) {
                bmRegistros = data.map((r, i) => ({ ...r, id: r.id || r._id || `temp-${i}` }));
                salvarDados();
                renderTabela();
            }
        })
        .catch(e => console.error('Erro ao carregar API:', e));
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    preencherSelectEmpresas();
    renderTabela();
    carregarDadosDaApi();

    const filterDate = document.getElementById("filterDate");
    if (filterDate) filterDate.addEventListener("change", renderTabela);

    const filterEmpresa = document.getElementById("filterEmpresa");
    if (filterEmpresa) filterEmpresa.addEventListener("change", renderTabela);

    const filterStatus = document.getElementById("filterStatus");
    if (filterStatus) filterStatus.addEventListener("change", renderTabela);

    const btnClearFilters = document.getElementById("btnClearFilters");
    if (btnClearFilters) btnClearFilters.addEventListener("click", limparFiltros);

    const btnSalvar = document.getElementById("btnSalvar");
    if (btnSalvar) btnSalvar.addEventListener("click", salvarRegistro);

    const btnLimparTudo = document.getElementById("btnLimparTudo");
    if (btnLimparTudo) btnLimparTudo.addEventListener("click", limparTodosDados);

    const inputDate = document.getElementById("inputDate");
    if (inputDate) inputDate.value = new Date().toISOString().slice(0, 10);
});
