console.log('App.js carregado!');

const EMPRESAS = ["Vieira", "Prado", "2A", "M2", "VMC", "3P", "GBR"];
const STORAGE_KEY = "bm-dashboard-local-v1";
const DELETE_PASSWORD = "V!e!r@BM$";
let bmRegistros = [];
let currentPage = 1;
const itemsPerPage = 50;

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
    if (isoDate.length === 10) {
        const [ano, mes, dia] = isoDate.split('-');
        return `${dia}/${mes}/${ano}`;
    }
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "";
    return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function aplicarFiltros() {
    const fDate = document.getElementById("filterDate").value;
    const fEmpresa = document.getElementById("filterEmpresa").value;
    const fStatus = document.getElementById("filterStatus").value;
    const searchTerm = document.getElementById("searchInput")?.value.toLowerCase() || "";

    return bmRegistros.filter(r => {
        let ok = true;

        if (fDate) {
            const recordDate = r.data?.substring(0, 10) || r.data;
            ok = ok && recordDate === fDate;
        }

        if (fEmpresa) ok = ok && r.empresa === fEmpresa;
        if (fStatus) ok = ok && r.status === fStatus;

        if (searchTerm) {
            const empresa = (r.empresa || "").toLowerCase();
            const facebook = (r.facebook || "").toLowerCase();
            const portfolio = (r.portifolio || "").toLowerCase();
            const obs = (r.obs || "").toLowerCase();

            ok = ok && (
                empresa.includes(searchTerm) ||
                facebook.includes(searchTerm) ||
                portfolio.includes(searchTerm) ||
                obs.includes(searchTerm)
            );
        }

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

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageInfo = document.getElementById("pageInfo");
    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");

    if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function renderTabela() {
    const lista = aplicarFiltros().sort((a, b) => b.data.localeCompare(a.data));
    const tbody = document.getElementById("tableBody");
    if (!tbody) return;

    const totalItems = lista.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedList = lista.slice(startIndex, endIndex);

    tbody.innerHTML = "";
    if (paginatedList.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="6" class="no-data">Nenhum registro encontrado. Cadastre as BM's no painel ao lado.</td>`;
        tbody.appendChild(tr);
    } else {
        paginatedList.forEach(r => {
            const badge = statusToBadge(r.status);
            const tr = document.createElement("tr");
            const portfolioText = r.portifolio ? `<div style="font-size:0.7rem;color:#6b7280;">${r.portifolio}</div>` : "";
            tr.innerHTML = `<td>${formatDateBr(r.data)}</td><td><span class="tag-empresa">${r.empresa}</span></td><td><div><strong>${r.facebook || "-"}</strong></div>${portfolioText}</td><td><span class="${badge.class}">${badge.text}</span></td><td style="max-width:220px; font-size:0.75rem;">${r.obs || ""}</td><td style="text-align:center;"><button class="btn-edit" data-id="${r.id}" title="Editar registro" style="background:none;border:none;cursor:pointer;padding:4px 8px;transition:opacity 0.2s;margin-right:4px;"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.333 2A1.886 1.886 0 0 1 14 4.667l-9 9-3.667 1 1-3.667 9-9Z" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button class="btn-delete" data-id="${r.id}" title="Excluir registro" style="background:none;border:none;cursor:pointer;padding:4px 8px;transition:opacity 0.2s;"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334Z" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></td>`;
            tbody.appendChild(tr);
        });
    }

    atualizarResumo(lista);
    renderPagination(totalItems);

    setTimeout(() => {
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function () {
                editarRegistro(this.getAttribute('data-id'));
            });
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function () {
                excluirRegistro(this.getAttribute('data-id'));
            });
        });
    }, 100);
}

function editarRegistro(id) {
    const registro = bmRegistros.find(r => r.id == id);
    if (!registro) return;

    const modal = document.getElementById('editModal');
    const editEmpresa = document.getElementById('editEmpresa');
    const editPassword = document.getElementById('editPassword');
    const btnConfirmar = document.getElementById('editConfirmar');

    if (editEmpresa.options.length === 0) {
        EMPRESAS.forEach(emp => editEmpresa.appendChild(new Option(emp, emp)));
    }

    document.getElementById("editDate").value = registro.data;
    document.getElementById("editEmpresa").value = registro.empresa;
    document.getElementById("editFacebook").value = registro.facebook || "";
    document.getElementById("editPortfolio").value = registro.portifolio || "";
    document.getElementById("editStatus").value = registro.status;
    document.getElementById("editObs").value = registro.obs || "";
    editPassword.value = '';
    btnConfirmar.disabled = true;

    modal.classList.add('active');

    editPassword.oninput = () => {
        btnConfirmar.disabled = editPassword.value !== DELETE_PASSWORD;
    };

    const btnCancelar = document.getElementById('editCancelar');

    btnConfirmar.onclick = null;
    btnCancelar.onclick = null;

    btnCancelar.onclick = () => {
        modal.classList.remove('active');
        editPassword.oninput = null;
    };

    btnConfirmar.onclick = () => {
        const data = document.getElementById("editDate").value;
        const empresa = document.getElementById("editEmpresa").value;
        const facebook = document.getElementById("editFacebook").value.trim();
        const portfolio = document.getElementById("editPortfolio").value.trim();
        const status = document.getElementById("editStatus").value;
        const obs = document.getElementById("editObs").value.trim();

        if (!data || !empresa || (!facebook && !portfolio)) {
            alert("Preencha pelo menos Data, Empresa e Facebook/BM.");
            return;
        }

        bmRegistros = bmRegistros.map(r => {
            if (r.id == id) {
                return { ...r, data, empresa, facebook, portifolio: portfolio, status, obs };
            }
            return r;
        });

        salvarDados();
        renderTabela();

        const payload = {
            id: registro.id,
            data,
            empresa,
            facebook,
            portifolio: portfolio,
            status,
            obs
        };

        fetch('https://webhook.sistemavieira.com.br/webhook/alter-bms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(r => console.log('Alteração enviada:', r.status))
            .then(() => carregarDadosDaApi())
            .catch(e => console.log('Erro ao alterar:', e));

        modal.classList.remove('active');
        editPassword.oninput = null;
    };

    modal.onclick = e => {
        if (e.target === modal) {
            modal.classList.remove('active');
            editPassword.oninput = null;
        }
    };
}

function excluirRegistro(id) {
    console.log('excluirRegistro chamado! ID:', id);
    const modal = document.getElementById('confirmModal');
    const btnConfirmar = document.getElementById('modalConfirmar');
    const btnCancelar = document.getElementById('modalCancelar');
    const passwordInput = document.getElementById('modalPassword');

    if (!modal || !btnConfirmar || !btnCancelar || !passwordInput) {
        console.error('Modal elements not found');
        return;
    }

    modal.classList.add('active');
    passwordInput.value = '';
    btnConfirmar.disabled = true;

    passwordInput.oninput = () => {
        btnConfirmar.disabled = passwordInput.value !== DELETE_PASSWORD;
    };

    btnConfirmar.onclick = null;
    btnCancelar.onclick = null;

    btnCancelar.onclick = () => {
        modal.classList.remove('active');
        passwordInput.oninput = null;
    };

    btnConfirmar.onclick = () => {
        console.log('Senha correta! Prosseguindo com exclusão...');
        const registro = bmRegistros.find(r => r.id == id);
        console.log('Registro encontrado:', registro);

        if (registro) {
            const payload = {
                id: registro.id,
                empresa: registro.empresa,
                nome: registro.facebook
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
        passwordInput.oninput = null;
    };

    modal.onclick = e => {
        if (e.target === modal) {
            modal.classList.remove('active');
            passwordInput.oninput = null;
        }
    };
}

function limparFiltros() {
    document.getElementById("filterDate").value = "";
    document.getElementById("filterEmpresa").value = "";
    document.getElementById("filterStatus").value = "";
    document.getElementById("searchInput").value = "";
    currentPage = 1;
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
        const rKey = r.empresa + "::" + (r.facebook || "").toLowerCase() + "::" + (r.portifolio || "").toLowerCase();
        if (rKey === key) {
            encontrado = true;
            return { ...r, data, status, obs };
        }
        return r;
    });

    if (!encontrado) {
        bmRegistros.push({
            id: String(Date.now()) + Math.random().toString(16).slice(2),
            data, empresa, facebook, portifolio: portfolio, status, obs
        });
    }

    salvarDados();
    renderTabela();

    fetch('https://webhook.sistemavieira.com.br/webhook/save-bms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, empresa, facebook, portifolio: portfolio, status, obs })
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
    currentPage = 1;
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

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    preencherSelectEmpresas();
    renderTabela();
    carregarDadosDaApi();

    const filterDate = document.getElementById("filterDate");
    if (filterDate) filterDate.addEventListener("change", () => { currentPage = 1; renderTabela(); });

    const filterEmpresa = document.getElementById("filterEmpresa");
    if (filterEmpresa) filterEmpresa.addEventListener("change", () => { currentPage = 1; renderTabela(); });

    const filterStatus = document.getElementById("filterStatus");
    if (filterStatus) filterStatus.addEventListener("change", () => { currentPage = 1; renderTabela(); });

    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.addEventListener("input", () => { currentPage = 1; renderTabela(); });

    const btnClearFilters = document.getElementById("btnClearFilters");
    if (btnClearFilters) btnClearFilters.addEventListener("click", limparFiltros);

    const btnSalvar = document.getElementById("btnSalvar");
    if (btnSalvar) btnSalvar.addEventListener("click", salvarRegistro);

    const btnLimparTudo = document.getElementById("btnLimparTudo");
    if (btnLimparTudo) btnLimparTudo.addEventListener("click", limparTodosDados);

    const prevPage = document.getElementById("prevPage");
    if (prevPage) prevPage.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderTabela(); } });

    const nextPage = document.getElementById("nextPage");
    if (nextPage) nextPage.addEventListener("click", () => { currentPage++; renderTabela(); });

    const inputDate = document.getElementById("inputDate");
    if (inputDate) inputDate.value = new Date().toISOString().slice(0, 10);
});
