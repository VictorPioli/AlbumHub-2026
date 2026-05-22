<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { albumData, grupos } from '../data/album'
import type { PaisFigurinhas, Figurinha } from '../types/figurinha'
import { getUser, saveAlbumState } from '../stores/users'

const props = defineProps<{
  username: string
  canEdit: boolean
}>()

const isAdmin = computed(() => props.canEdit)

function aplicarEstado(base: PaisFigurinhas[], estado: Record<string, { possui: boolean; repetida: boolean }>) {
  base.forEach(pais =>
    pais.figurinhas.forEach(f => {
      if (estado[f.id]) {
        f.possui = estado[f.id].possui
        f.repetida = estado[f.id].repetida
      }
    })
  )
}

const paises = ref<PaisFigurinhas[]>(JSON.parse(JSON.stringify(albumData)))

onMounted(async () => {
  const user = await getUser(props.username)
  if (user && Object.keys(user.albumState).length > 0) {
    const base: PaisFigurinhas[] = JSON.parse(JSON.stringify(albumData))
    aplicarEstado(base, user.albumState)
    paises.value = base
  }
})
const filtro = ref('')
const grupoSelecionado = ref<string | null>(null)
const filtroEstado = ref<'todos' | 'faltantes' | 'repetidas'>('todos')

// Grupos reativos mapeados para os países reativos
const gruposReativos = computed(() =>
  grupos.map(g => ({
    ...g,
    paises: g.paises.map(p => paises.value.find(pr => pr.prefixo === p.prefixo)!),
  }))
)

const gruposFiltrados = computed(() => {
  const termo = filtro.value.toLowerCase()
  return gruposReativos.value
    .map(g => ({
      ...g,
      paises: g.paises
        .filter(p => {
          const grupoMatch = !grupoSelecionado.value || g.letra === grupoSelecionado.value
          const termoMatch = !termo || p.pais.toLowerCase().includes(termo) || g.letra.toLowerCase().includes(termo)
          return grupoMatch && termoMatch
        })
        .map(p => ({
          ...p,
          figurinhas: filtroEstado.value === 'todos'
            ? p.figurinhas
            : filtroEstado.value === 'faltantes'
              ? p.figurinhas.filter(f => !f.possui)
              : p.figurinhas.filter(f => f.repetida),
        }))
        .filter(p => p.figurinhas.length > 0),
    }))
    .filter(g => g.paises.length > 0)
})

const totalFigurinhas = computed(() =>
  paises.value.reduce((t, p) => t + p.figurinhas.length, 0)
)

const figurinhasObtidas = computed(() =>
  paises.value.reduce((t, p) => t + p.figurinhas.filter(f => f.possui).length, 0)
)

const porcentagem = computed(() =>
  totalFigurinhas.value === 0 ? 0 : Math.round((figurinhasObtidas.value / totalFigurinhas.value) * 100)
)

const figurinhasGrupo = (letra: string) => {
  const g = gruposReativos.value.find(g => g.letra === letra)
  if (!g) return { obtidas: 0, total: 0 }
  const total = g.paises.reduce((t, p) => t + p.figurinhas.length, 0)
  const obtidas = g.paises.reduce((t, p) => t + p.figurinhas.filter(f => f.possui).length, 0)
  return { obtidas, total }
}

const toggleFigurinha = (figurinha: Figurinha) => {
  if (!isAdmin.value) return
  if (!figurinha.possui) {
    figurinha.possui = true
    figurinha.repetida = false
  } else if (!figurinha.repetida) {
    figurinha.repetida = true
  } else {
    figurinha.possui = false
    figurinha.repetida = false
  }
}

const figurinhasRepetidas = computed(() =>
  paises.value.reduce((t, p) => t + p.figurinhas.filter(f => f.repetida).length, 0)
)

watch(
  paises,
  (val) => {
    const obtidas = val.flatMap(p =>
      p.figurinhas
        .filter(f => f.possui && !f.repetida)
        .map(f => f.id)
    )
    const repetidas = val.flatMap(p =>
      p.figurinhas
        .filter(f => f.repetida)
        .map(f => f.id)
    )
    console.clear()
    console.group('%c⚽ Álbum Copa 2026 — Estado atual', 'font-weight:bold; font-size:14px; color:#111')
    console.log(`%c✅ Tenho (${obtidas.length})`, 'color: #16a34a; font-weight:bold', obtidas)
    console.log(`%c🔄 Repetidas (${repetidas.length})`, 'color: #d97706; font-weight:bold', repetidas)
    console.log(`%c📊 Total marcadas: ${obtidas.length + repetidas.length} / ${val.reduce((t, p) => t + p.figurinhas.length, 0)}`, 'color: #3b82f6; font-weight:bold')
    console.groupEnd()
  },
  { deep: true }
)

const salvando = ref(false)
const salvoComSucesso = ref(false)

const salvarAlbum = async () => {
  if (!props.canEdit) return
  salvando.value = true
  const estado: Record<string, { possui: boolean; repetida: boolean }> = {}
  paises.value.forEach(p => p.figurinhas.forEach(f => {
    if (f.possui || f.repetida) estado[f.id] = { possui: f.possui, repetida: f.repetida }
  }))
  await saveAlbumState(props.username, estado)
  salvando.value = false
  salvoComSucesso.value = true
  setTimeout(() => { salvoComSucesso.value = false }, 2500)
}

const limparFiltro = () => {
  filtro.value = ''
  grupoSelecionado.value = null
  filtroEstado.value = 'todos'
}
</script>

<template>
  <div class="album-container">
    <header class="header">
      <div class="header-modo">
        <span v-if="isAdmin" class="badge-admin">✏️ Editando</span>
        <span v-else class="badge-readonly">Somente Leitura</span>
      </div>
      <div class="header-main">
        <span class="header-title">Álbum Copa 2026</span>
        <div class="header-progress">
          <div class="header-progress-bar">
            <div class="header-progress-fill" :style="{ width: porcentagem + '%' }"></div>
          </div>
          <span class="header-progress-label">{{ figurinhasObtidas }} / {{ totalFigurinhas }} &nbsp;·&nbsp; {{ porcentagem }}%</span>
        </div>
      </div>
    </header>

    <div class="controles">
      <input
        v-model="filtro"
        type="text"
        placeholder="Pesquise por país ou grupo (ex: Grupo A)..."
        class="search-input"
      />
      <button
        v-if="filtro || grupoSelecionado || filtroEstado !== 'todos'"
        @click="limparFiltro"
        class="btn-limpar"
      >
        ✕ Limpar
      </button>
      <button
        v-if="isAdmin"
        @click="salvarAlbum"
        :disabled="salvando"
        class="btn-salvar"
      >
        <span v-if="salvando">⏳ Salvando...</span>
        <span v-else-if="salvoComSucesso">✅ Salvo!</span>
        <span v-else>💾 Salvar</span>
      </button>
    </div>

    <!-- Filtro faltantes/repetidas (apenas visitantes) -->
    <div v-if="!isAdmin" class="filtro-estado">
      <button
        class="filtro-estado-btn"
        :class="{ ativo: filtroEstado === 'todos' }"
        @click="filtroEstado = 'todos'"
      >Todas</button>
      <button
        class="filtro-estado-btn filtro-estado-btn--faltantes"
        :class="{ ativo: filtroEstado === 'faltantes' }"
        @click="filtroEstado = 'faltantes'"
      >Faltantes</button>
      <button
        class="filtro-estado-btn filtro-estado-btn--repetidas"
        :class="{ ativo: filtroEstado === 'repetidas' }"
        @click="filtroEstado = 'repetidas'"
      >Repetidas</button>
    </div>

    <!-- Filtro de grupos -->
    <div class="grupos-filtro">
      <button
        v-for="g in gruposReativos"
        :key="g.letra"
        class="grupo-chip"
        :class="{ ativo: grupoSelecionado === g.letra }"
        @click="grupoSelecionado = grupoSelecionado === g.letra ? null : g.letra"
      >
        <span class="chip-letra">{{ g.letra === 'Especial' ? '★' : g.letra }}</span>
        <span class="chip-prog">
          {{ figurinhasGrupo(g.letra).obtidas }}/{{ figurinhasGrupo(g.letra).total }}
        </span>
      </button>
    </div>

    <!-- Seções por grupo -->
    <div v-for="grupo in gruposFiltrados" :key="grupo.letra" class="grupo-secao">
      <div class="grupo-header">
        <h2 class="grupo-titulo">
          <span class="grupo-badge">{{ grupo.letra === 'Especial' ? '★ Especial' : `Grupo ${grupo.letra}` }}</span>
          <span class="grupo-paises-nomes">
            {{ grupo.paises.map(p => p.pais).join(' · ') }}
          </span>
        </h2>
        <div class="grupo-mini-prog">
          <span>{{ figurinhasGrupo(grupo.letra).obtidas }}/{{ figurinhasGrupo(grupo.letra).total }}</span>
          <div class="mini-bar">
            <div
              class="mini-bar-fill"
              :style="{
                width: figurinhasGrupo(grupo.letra).total > 0
                  ? (figurinhasGrupo(grupo.letra).obtidas / figurinhasGrupo(grupo.letra).total * 100) + '%'
                  : '0%'
              }"
            ></div>
          </div>
        </div>
      </div>

      <div class="paises-grid">
        <div
          v-for="pais in grupo.paises"
          :key="pais.pais"
          class="pais-card"
        >
          <div class="pais-header-panini">
            <div class="bandeira-img-container">
              <img v-if="pais.bandeira.startsWith('/')" :src="pais.bandeira" :alt="pais.prefixo" class="bandeira-svg" />
              <span v-else class="bandeira">{{ pais.bandeira }}</span>
            </div>
            <h3 class="pais-nome">{{ pais.pais }}</h3>
          </div>
          <div class="figurinhas-grid">
            <button
              v-for="figurinha in pais.figurinhas"
              :key="figurinha.id"
              class="figurinha-btn"
              :class="{ obtida: figurinha.possui && !figurinha.repetida, repetida: figurinha.repetida, readonly: !isAdmin }"
              @click="toggleFigurinha(figurinha)"
              :title="figurinha.repetida ? figurinha.id + ' (repetida)' : figurinha.id"
            >
              <span class="numero">{{ figurinha.id }}</span>
              <span v-if="figurinha.repetida" class="checkmark">+1</span>
              <span v-else-if="figurinha.possui" class="checkmark">✓</span>
            </button>
          </div>
          <div class="pais-stats">
            {{ pais.figurinhas.filter(f => f.possui).length }} / {{ pais.figurinhas.length }}
          </div>
        </div>
      </div>
    </div>

    <footer class="footer">
      <p>Total: {{ figurinhasObtidas }} de {{ totalFigurinhas }} figurinhas ({{ porcentagem }}%)</p>
      <p v-if="figurinhasRepetidas > 0">🔄 {{ figurinhasRepetidas }} figurinha(s) repetida(s) para trocar</p>
      <p v-if="!isAdmin" class="readonly-aviso">👁️ Modo leitura — faça login para editar seu álbum</p>
      <p v-else>1 clique = tenho · 2 cliques = repetida · 3 cliques = apagar</p>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.album-container {
  min-height: 100vh;
  background-color: #f4f5f7;
  padding: 20px;
  font-family: 'Montserrat', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #111;
}

/* Header */
.header {
  margin-bottom: 20px;
  background: #ffffff;
  padding: 14px 20px 14px;
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: linear-gradient(90deg, #e3342f 0%, #f6993f 20%, #f1c40f 40%, #38c172 60%, #3490dc 80%, #9561e2 100%);
}

.header-main {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
}

.header-title {
  font-size: 0.95em;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: 0.1px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Montserrat', sans-serif;
}

.header-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 360px;
}

.header-progress-bar {
  flex: 1;
  height: 4px;
  background: #e8e8ed;
  border-radius: 4px;
  overflow: hidden;
}

.header-progress-fill {
  height: 100%;
  background: #1d1d1f;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.header-progress-label {
  font-size: 0.75em;
  font-weight: 500;
  color: #86868b;
  white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Montserrat', sans-serif;
}

/* Controles */
.controles {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.search-input {
  flex: 1;
  padding: 12px 18px;
  border: 2px solid #cbd5e1;
  border-radius: 10px;
  font-size: 1em;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  background: #ffffff;
  color: #333;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #111;
}

.btn-limpar {
  padding: 11px 18px;
  background: #e3342f; /* Panini Red */
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9em;
  text-transform: uppercase;
  transition: background 0.2s;
}

.btn-limpar:hover {
  background: #cc1f1a;
}

.btn-salvar {
  padding: 11px 18px;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9em;
  font-family: 'Montserrat', sans-serif;
  text-transform: uppercase;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-salvar:hover {
  background: #15803d;
}

.btn-importar {
  padding: 11px 18px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9em;
  font-family: 'Montserrat', sans-serif;
  text-transform: uppercase;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-importar:hover {
  background: #1d4ed8;
}

.btn-publicar {
  padding: 11px 18px;
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9em;
  font-family: 'Montserrat', sans-serif;
  text-transform: uppercase;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-publicar:hover {
  background: #6d28d9;
}

/* Filtro faltantes/repetidas */
.filtro-estado {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-bottom: 16px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}
.filtro-estado-btn {
  padding: 6px 18px;
  border: 1px solid rgba(0,0,0,0.14);
  border-radius: 20px;
  background: transparent;
  color: #6e6e73;
  font-size: 0.82em;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Montserrat', sans-serif;
  cursor: pointer;
  transition: all 0.15s;
}
.filtro-estado-btn:hover { border-color: rgba(0,0,0,0.28); color: #1d1d1f; }
.filtro-estado-btn.ativo { background: #1d1d1f; color: #f5f5f7; border-color: #1d1d1f; }
.filtro-estado-btn--faltantes.ativo { background: #ff3b30; border-color: #ff3b30; }
.filtro-estado-btn--repetidas.ativo { background: #f59e0b; border-color: #f59e0b; color: #fff; }

/* Chips de grupos */
.grupos-filtro {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 28px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.grupo-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 14px;
  border-radius: 12px;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 54px;
}

.grupo-chip:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
  transform: translateY(-2px);
}

.grupo-chip.ativo {
  background: #111;
  border-color: #111;
  color: #fff;
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}

.chip-letra {
  font-size: 1.2em;
  font-weight: 900;
}

.chip-prog {
  font-size: 0.7em;
  font-weight: 700;
  opacity: 0.9;
  margin-top: 2px;
}

/* Seção de grupo */
.grupo-secao {
  margin-bottom: 36px;
}

.grupo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
  padding: 14px 20px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border-left: 6px solid #111;
}

.grupo-titulo {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.grupo-badge {
  background: #111;
  color: white;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 1.1em;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.5px;
}

.grupo-paises-nomes {
  color: #64748b;
  font-size: 0.9em;
  font-weight: 700;
}

.grupo-mini-prog {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #475569;
  font-size: 0.9em;
  font-weight: 700;
  white-space: nowrap;
}

.mini-bar {
  width: 100px;
  height: 10px;
  background: #e2e8f0;
  border-radius: 5px;
  overflow: hidden;
}

.mini-bar-fill {
  height: 100%;
  background: #111;
  transition: width 0.4s ease;
}

/* Grid de países */
.paises-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.pais-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.03);
  border: 1px solid #e2e8f0;
  transition: transform 0.2s, box-shadow 0.2s;
}

.pais-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.05);
}

.pais-header-panini {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.bandeira-img-container {
  width: 36px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.bandeira-svg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pais-nome {
  margin: 0;
  font-size: 1.15em;
  font-weight: 700;
  color: #111;
}

.bandeira {
  font-size: 1.4em;
}

.figurinhas-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.figurinha-btn {
  aspect-ratio: 1;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  cursor: pointer;
  font-weight: 700;
  font-family: 'Montserrat', sans-serif;
  color: #555;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 1px;
}

.figurinha-btn:hover {
  transform: scale(1.1);
  border-color: #111;
  background: #fff;
  z-index: 1;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.figurinha-btn.obtida {
  background: #111;
  border-color: #111;
  color: white;
}

.figurinha-btn.repetida {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-color: #b45309;
  color: white;
}

.numero {
  font-size: 0.65em;
  word-break: break-all;
  text-align: center;
  line-height: 1.1;
}

.figurinha-btn.obtida .numero {
  color: #fff;
}

.checkmark {
  font-size: 1.1em;
  line-height: 1;
  color: #38c172; /* Subtle green check */
}

.pais-stats {
  text-align: center;
  font-weight: 700;
  font-size: 0.9em;
  color: #64748b;
  padding-top: 10px;
  border-top: 2px solid #f1f5f9;
}

/* Footer */
.footer {
  background: #ffffff;
  color: #64748b;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  margin-top: 20px;
  border: 1px solid #e2e8f0;
  font-weight: 600;
}

.footer p {
  margin: 4px 0;
  font-size: 0.95em;
}

.readonly-aviso {
  color: #94a3b8;
  font-style: italic;
}

/* Header modo */
.header-modo {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 12px;
}

.badge-admin {
  background: #111;
  color: #fff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: 700;
}

.badge-readonly {
  background: #e2e8f0;
  color: #64748b;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: 700;
}

.btn-modo {
  padding: 5px 14px;
  border-radius: 8px;
  border: 2px solid #111;
  background: transparent;
  color: #111;
  font-weight: 700;
  font-size: 0.8em;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  transition: all 0.2s;
}

.btn-modo:hover {
  background: #111;
  color: #fff;
}

/* Figurinha readonly */
.figurinha-btn.readonly {
  cursor: default;
  opacity: 0.9;
}

.figurinha-btn.readonly:hover {
  transform: none;
  border-color: #e2e8f0;
  box-shadow: none;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 16px;
  padding: 32px 28px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal h2 {
  font-size: 1.4em;
  font-weight: 900;
  color: #111;
}

.modal p {
  color: #64748b;
  font-size: 0.95em;
}

.modal-input {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1em;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  transition: border-color 0.2s;
}

.modal-input:focus {
  outline: none;
  border-color: #111;
}

.modal-erro {
  color: #e3342f !important;
  font-weight: 700;
  font-size: 0.9em !important;
}

.modal-acoes {
  display: flex;
  gap: 10px;
}

@media (max-width: 768px) {
  .header h1 { font-size: 1.8em; }
  .controles { flex-direction: column; }
  .grupo-header { flex-direction: column; align-items: flex-start; }
  .mini-bar { width: 80px; }
  .paises-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
}

@media (max-width: 480px) {
  .album-container { padding: 10px; }
  .header h1 { font-size: 1.5em; }
  .paises-grid { grid-template-columns: 1fr; }
  .figurinhas-grid { grid-template-columns: repeat(4, 1fr); }
}
</style>
