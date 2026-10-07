const STORAGE_KEY = 'tarefas-dom';

const formTarefa = document.querySelector('#form-tarefa');
const campoTarefa = document.querySelector('#tarefa');
const campoHora = document.querySelector('#hora-tarefa');
const campoData = document.querySelector('#data-tarefa');
const toggleDataTarefa = document.querySelector('#toggle-data-tarefa');
const campoDataTarefa = document.querySelector('#campo-data-tarefa');
const campoDias = document.querySelector('#dias-selecionados');
const contador = document.querySelector('#contador');
const listaTarefas = document.querySelector('#lista-tarefas');
const themeToggle = document.querySelector('#theme-toggle');
const modalEditar = document.querySelector('#modal-editar');
const formEditar = document.querySelector('#form-editar');
const editarId = document.querySelector('#editar-id');
const editarTarefa = document.querySelector('#editar-tarefa');
const editarHora = document.querySelector('#editar-hora');
const editarData = document.querySelector('#editar-data');
const toggleEditarData = document.querySelector('#toggle-editar-data');
const campoEditarData = document.querySelector('#campo-editar-data');
const editarDias = document.querySelector('#editar-dias');
const cancelarEdicao = document.querySelector('#cancelar-edicao');
const modalConfirmacao = document.querySelector('#modal-confirmacao');
const confirmacaoTexto = document.querySelector('#confirmacao-texto');
const cancelarExclusao = document.querySelector('#cancelar-exclusao');
const confirmarExclusao = document.querySelector('#confirmar-exclusao');

let tarefas = [];
let darkMode = false;
const lembretesAgendados = new Map();
let tarefaParaExcluir = null;

function getDiasSelecionados(container) {
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((checkbox) => Number(checkbox.value));
}

function formatarDias(diasSemana = []) {
  if (!diasSemana.length) {
    return '—';
  }

  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return diasSemana.map((dia) => nomes[dia]).join(', ');
}

function formatarData(data) {
  if (!data) {
    return '—';
  }

  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR');
}

function proximoDiaDaSemana(diasSelecionados, referencia) {
  const hoje = new Date(referencia);
  hoje.setHours(0, 0, 0, 0);

  for (let i = 0; i < 14; i += 1) {
    const dataTeste = new Date(hoje);
    dataTeste.setDate(hoje.getDate() + i);
    const dia = dataTeste.getDay();

    if (diasSelecionados.includes(dia)) {
      const horarioAtual = new Date(dataTeste);
      horarioAtual.setHours(referencia.getHours(), referencia.getMinutes(), 0, 0);
      return horarioAtual;
    }
  }

  return null;
}

function calcularProximaOcorrencia(tarefa, referencia = new Date()) {
  const horarioPadrao = tarefa.horario || '08:00';
  const [hora, minuto] = horarioPadrao.split(':').map(Number);

  if (tarefa.diasSemana && tarefa.diasSemana.length > 0) {
    for (let i = 0; i < 14; i += 1) {
      const dataTeste = new Date(referencia);
      dataTeste.setDate(referencia.getDate() + i);
      dataTeste.setHours(0, 0, 0, 0);

      if (tarefa.diasSemana.includes(dataTeste.getDay())) {
        const dataAlvo = new Date(dataTeste);
        dataAlvo.setHours(hora, minuto, 0, 0);

        if (dataAlvo > referencia) {
          return dataAlvo;
        }
      }
    }

    return null;
  }

  if (tarefa.data) {
    const dataAlvo = new Date(`${tarefa.data}T${horarioPadrao}:00`);
    if (dataAlvo > referencia) {
      return dataAlvo;
    }

    const amanha = new Date(referencia);
    amanha.setHours(hora, minuto, 0, 0);
    amanha.setDate(amanha.getDate() + 1);
    return amanha;
  }

  const hojeComHora = new Date(referencia);
  hojeComHora.setHours(hora, minuto, 0, 0);

  if (hojeComHora > referencia) {
    return hojeComHora;
  }

  const amanha = new Date(referencia);
  amanha.setHours(hora, minuto, 0, 0);
  amanha.setDate(amanha.getDate() + 1);
  return amanha;
}

function agendarLembrete(tarefa) {
  if (!tarefa.horario && !tarefa.data) {
    return;
  }

  const lembreteExistente = lembretesAgendados.get(tarefa.id);
  if (lembreteExistente) {
    clearTimeout(lembreteExistente);
  }

  const proximaOcorrencia = calcularProximaOcorrencia(tarefa, new Date());
  if (!proximaOcorrencia) {
    return;
  }

  const delay = proximaOcorrencia.getTime() - Date.now();

  const timer = setTimeout(() => {
    alert(`⏰ Lembrete: ${tarefa.texto}\nHora: ${tarefa.horario || '00:00'}\nData: ${tarefa.data || 'hoje'}\nDias: ${formatarDias(tarefa.diasSemana || [])}`);
  }, delay);

  lembretesAgendados.set(tarefa.id, timer);
}


// Modo claro/escuro
function alternarTema() {
  darkMode = !darkMode;
  document.body.classList.toggle('dark-mode', darkMode);
  themeToggle.textContent = darkMode ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-label', darkMode ? 'Ativar modo claro' : 'Ativar modo escuro');
}

// Funções 
function obterTarefas() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    return salvo ? JSON.parse(salvo) : [];
  } catch (error) {
    console.error('Erro ao carregar tarefas do localStorage:', error);
    return [];
  }
}

function salvarTarefas() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tarefas));
  } catch (error) {
    console.error('Erro ao salvar tarefas no localStorage:', error);
  }
}

function atualizarContador() {
  const total = tarefas.length;
  contador.textContent = total === 1 ? '1 tarefa' : `${total} tarefas`;
}

function escaparHtml(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderizarTarefas() {
  atualizarContador();
  listaTarefas.innerHTML = '';

  if (tarefas.length === 0) {
    const linhaVazia = document.createElement('tr');
    linhaVazia.innerHTML = `
      <td colspan="7" class="text-center text-muted py-4">
        Nenhuma tarefa cadastrada.
      </td>
    `;
    listaTarefas.appendChild(linhaVazia);
    return;
  }

  tarefas.forEach((tarefa, indice) => {
    const linha = document.createElement('tr');
    const concluida = tarefa.concluida;

    linha.innerHTML = `
      <td>${indice + 1}</td>
      <td class="${concluida ? 'text-decoration-line-through text-muted' : ''}">
        ${escaparHtml(tarefa.texto)}
      </td>
      <td>${tarefa.horario ? tarefa.horario : '—'}</td>
      <td>${formatarData(tarefa.data)}</td>
      <td>${formatarDias(tarefa.diasSemana || [])}</td>
      <td>
        <span class="badge ${concluida ? 'text-bg-success' : 'text-bg-warning text-dark'}">
          ${concluida ? 'Concluída' : 'Pendente'}
        </span>
      </td>
      <td class="text-center">
        <div class="btn-group btn-group-sm" role="group" aria-label="Ações da tarefa">
          <button
            type="button"
            class="btn btn-info btn-editar"
            data-id="${tarefa.id}"
          >
            Editar
          </button>
          <button
            type="button"
            class="btn ${concluida ? 'btn-outline-secondary' : 'btn-success'} btn-marcar"
            data-id="${tarefa.id}"
          >
            ${concluida ? 'Reabrir' : 'Concluir'}
          </button>
          <button
            type="button"
            class="btn btn-danger btn-remover"
            data-id="${tarefa.id}"
          >
            Excluir
          </button>
        </div>
      </td>
    `;

    listaTarefas.appendChild(linha);
  });
}

function adicionarTarefa(texto, horario, data, diasSemana) {
  const tarefa = {
    id: Date.now() + Math.random(),
    texto: texto.trim(),
    horario: horario || null,
    data: data || null,
    diasSemana: diasSemana || [],
    concluida: false,
  };

  tarefas.unshift(tarefa);
  agendarLembrete(tarefa);
  salvarTarefas();
  renderizarTarefas();
}

function marcarComoConcluida(id) {
  tarefas = tarefas.map((tarefa) => {
    if (tarefa.id === id) {
      return { ...tarefa, concluida: !tarefa.concluida };
    }
    return tarefa;
  });

  salvarTarefas();
  renderizarTarefas();
}

function abrirModalConfirmacao(id) {
  const tarefa = tarefas.find((item) => item.id === id);

  if (!tarefa) {
    return;
  }

  tarefaParaExcluir = tarefa;
  confirmacaoTexto.textContent = `Deseja realmente excluir a tarefa "${tarefa.texto}"?`;
  modalConfirmacao.classList.remove('hidden');
  modalConfirmacao.setAttribute('aria-hidden', 'false');
}

function fecharModalConfirmacao() {
  modalConfirmacao.classList.add('hidden');
  modalConfirmacao.setAttribute('aria-hidden', 'true');
  tarefaParaExcluir = null;
}

function removerTarefa(id) {
  const tarefa = tarefas.find((item) => item.id === id);

  if (!tarefa) {
    return;
  }

  abrirModalConfirmacao(id);
}

function confirmarRemocao() {
  if (!tarefaParaExcluir) {
    return;
  }

  const id = tarefaParaExcluir.id;
  tarefas = tarefas.filter((item) => item.id !== id);

  const lembrete = lembretesAgendados.get(id);
  if (lembrete) {
    clearTimeout(lembrete);
    lembretesAgendados.delete(id);
  }

  salvarTarefas();
  renderizarTarefas();
  fecharModalConfirmacao();
}

function abrirModalEdicao(id) {
  const tarefa = tarefas.find((item) => item.id === id);
  if (!tarefa) {
    return;
  }

  editarId.value = tarefa.id;
  editarTarefa.value = tarefa.texto;
  editarHora.value = tarefa.horario || '';
  editarData.value = tarefa.data || '';
  const temData = Boolean(tarefa.data);
  toggleEditarData.checked = temData;
  campoEditarData.style.display = temData ? 'block' : 'none';

  const checkboxes = editarDias.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    checkbox.checked = (tarefa.diasSemana || []).includes(Number(checkbox.value));
  });

  modalEditar.classList.remove('hidden');
  modalEditar.setAttribute('aria-hidden', 'false');
}

function fecharModalEdicao() {
  modalEditar.classList.add('hidden');
  modalEditar.setAttribute('aria-hidden', 'true');
  formEditar.reset();
}

toggleDataTarefa.addEventListener('change', () => {
  campoDataTarefa.style.display = toggleDataTarefa.checked ? 'block' : 'none';
  if (!toggleDataTarefa.checked) {
    campoData.value = '';
  }
});

campoTarefa.addEventListener('keydown', (evento) => {
  if (evento.key !== 'Enter') {
    return;
  }

  evento.preventDefault();
  campoHora.focus();
});

formTarefa.addEventListener('submit', (evento) => {
  evento.preventDefault();

  const texto = campoTarefa.value.trim();
  const horario = campoHora.value;
  const data = toggleDataTarefa.checked ? campoData.value : null;
  const diasSemana = getDiasSelecionados(campoDias);

  if (!texto) {
    campoTarefa.classList.add('is-invalid');
    campoTarefa.focus();
    return;
  }

  if (horario && !/^\d{2}:\d{2}$/.test(horario)) {
    alert('Digite a hora no formato HH:MM.');
    campoHora.focus();
    return;
  }

  campoTarefa.classList.remove('is-invalid');
  adicionarTarefa(texto, horario || null, data || null, diasSemana);
  formTarefa.reset();
  toggleDataTarefa.checked = false;
  campoDataTarefa.style.display = 'none';
  campoTarefa.focus();
});

toggleEditarData.addEventListener('change', () => {
  campoEditarData.style.display = toggleEditarData.checked ? 'block' : 'none';
  if (!toggleEditarData.checked) {
    editarData.value = '';
  }
});

formEditar.addEventListener('submit', (evento) => {
  evento.preventDefault();

  const id = Number(editarId.value);
  const tarefa = tarefas.find((item) => item.id === id);
  if (!tarefa) {
    return;
  }

  const novoTexto = editarTarefa.value.trim();
  const novaHora = editarHora.value;
  const novaData = toggleEditarData.checked ? editarData.value : null;
  const novosDias = getDiasSelecionados(editarDias);

  if (!novoTexto) {
    editarTarefa.classList.add('is-invalid');
    editarTarefa.focus();
    return;
  }

  editarTarefa.classList.remove('is-invalid');

  tarefa.texto = novoTexto;
  tarefa.horario = novaHora || null;
  tarefa.data = novaData || null;
  tarefa.diasSemana = novosDias;

  const lembrete = lembretesAgendados.get(id);
  if (lembrete) {
    clearTimeout(lembrete);
    lembretesAgendados.delete(id);
  }

  agendarLembrete(tarefa);
  salvarTarefas();
  renderizarTarefas();
  fecharModalEdicao();
});

listaTarefas.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button');

  if (!botao) {
    return;
  }

  const id = Number(botao.dataset.id);

  if (botao.classList.contains('btn-marcar')) {
    marcarComoConcluida(id);
  }

  if (botao.classList.contains('btn-remover')) {
    removerTarefa(id);
  }

  if (botao.classList.contains('btn-editar')) {
    abrirModalEdicao(id);
  }
});

cancelarEdicao.addEventListener('click', fecharModalEdicao);
modalEditar.addEventListener('click', (evento) => {
  if (evento.target === modalEditar) {
    fecharModalEdicao();
  }
});

cancelarExclusao.addEventListener('click', fecharModalConfirmacao);
confirmarExclusao.addEventListener('click', confirmarRemocao);
modalConfirmacao.addEventListener('click', (evento) => {
  if (evento.target === modalConfirmacao) {
    fecharModalConfirmacao();
  }
});

themeToggle.addEventListener('click', alternarTema);

function iniciar() {
  tarefas = obterTarefas();
  tarefas.forEach((tarefa) => agendarLembrete(tarefa));
  renderizarTarefas();
}

document.addEventListener('DOMContentLoaded', iniciar);
