<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUser, currentUser, logout } from '../stores/users'
import { albumData } from '../data/album'

const route = useRoute()
const router = useRouter()

const user1Name = computed(() => route.params.user1 as string)
const user2Name = computed(() => route.params.user2 as string)

interface MatchGroup {
  prefixo: string
  pais: string
  bandeira: string
  numeros: number[]
}

const notFound = ref<string[]>([])
const user1CanGive = ref<MatchGroup[]>([])
const user2CanGive = ref<MatchGroup[]>([])
const loadingCompare = ref(true)

const totalUser1Gives = computed(() => user1CanGive.value.reduce((t, g) => t + g.numeros.length, 0))
const totalUser2Gives = computed(() => user2CanGive.value.reduce((t, g) => t + g.numeros.length, 0))

onMounted(async () => {
  const [u1, u2] = await Promise.all([getUser(user1Name.value), getUser(user2Name.value)])

  if (!u1) notFound.value.push(user1Name.value)
  if (!u2) notFound.value.push(user2Name.value)
  if (!u1 || !u2) return

  const s1 = u1.albumState
  const s2 = u2.albumState

  // Build a map of all stickers by prefixo for quick lookup
  const allStickers: Record<string, { prefixo: string; pais: string; bandeira: string; numero: number }[]> = {}
  for (const pais of albumData) {
    allStickers[pais.prefixo] = pais.figurinhas.map(f => ({
      prefixo: pais.prefixo,
      pais: pais.pais,
      bandeira: pais.bandeira,
      numero: f.numero,
    }))
  }

  // user1 has repeated → user2 doesn't have
  const gives1: Record<string, MatchGroup> = {}
  for (const [id, state] of Object.entries(s1)) {
    if (!state.repetida) continue
    const state2 = s2[id]
    if (!state2?.possui) {
      // Match! user1 can give this to user2
      const match = id.match(/^([A-Z]+)(\d+)$/)
      if (!match) continue
      const prefixo = match[1]
      const numero = parseInt(match[2])
      if (!gives1[prefixo]) {
        const paisData = albumData.find(p => p.prefixo === prefixo)
        gives1[prefixo] = { prefixo, pais: paisData?.pais ?? prefixo, bandeira: paisData?.bandeira ?? '', numeros: [] }
      }
      gives1[prefixo].numeros.push(numero)
    }
  }

  // user2 has repeated → user1 doesn't have
  const gives2: Record<string, MatchGroup> = {}
  for (const [id, state] of Object.entries(s2)) {
    if (!state.repetida) continue
    const state1 = s1[id]
    if (!state1?.possui) {
      const match = id.match(/^([A-Z]+)(\d+)$/)
      if (!match) continue
      const prefixo = match[1]
      const numero = parseInt(match[2])
      if (!gives2[prefixo]) {
        const paisData = albumData.find(p => p.prefixo === prefixo)
        gives2[prefixo] = { prefixo, pais: paisData?.pais ?? prefixo, bandeira: paisData?.bandeira ?? '', numeros: [] }
      }
      gives2[prefixo].numeros.push(numero)
    }
  }

  user1CanGive.value = Object.values(gives1).map(g => ({ ...g, numeros: g.numeros.sort((a, b) => a - b) }))
    .sort((a, b) => a.pais.localeCompare(b.pais))
  user2CanGive.value = Object.values(gives2).map(g => ({ ...g, numeros: g.numeros.sort((a, b) => a - b) }))
    .sort((a, b) => a.pais.localeCompare(b.pais))
  loadingCompare.value = false
})

const handleLogout = () => {
  logout()
  router.push('/')
}
</script>

<template>
  <!-- Nav -->
  <nav class="compare-nav">
    <router-link to="/" class="nav-logo">⚽ Album Copa 2026</router-link>
    <div class="nav-right">
      <template v-if="currentUser">
        <router-link :to="`/${currentUser}`" class="nav-link">@{{ currentUser }}</router-link>
        <button @click="handleLogout" class="btn-nav-ghost">Sair</button>
      </template>
      <router-link v-else to="/" class="btn-nav">Entrar</router-link>
    </div>
  </nav>

  <div class="compare-page">

    <div v-if="loadingCompare" class="loading-screen">
      <div class="loading-spinner"></div>
      <p>Calculando trocas...</p>
    </div>

    <!-- Not found warning -->
    <div v-else-if="notFound.length > 0" class="not-found">
      <h2>😕 Usuário não encontrado</h2>
      <p v-for="u in notFound" :key="u">O usuário <strong>{{ u }}</strong> não existe.</p>
      <router-link to="/" class="btn-back">← Voltar</router-link>
    </div>

    <template v-else>
      <header class="compare-header">
        <div class="compare-title-row">
          <div class="compare-user">
            <div class="compare-avatar">{{ user1Name[0]?.toUpperCase() }}</div>
            <router-link :to="`/${user1Name}`" class="compare-username">{{ user1Name }}</router-link>
          </div>
          <span class="compare-vs">🔄</span>
          <div class="compare-user compare-user--right">
            <router-link :to="`/${user2Name}`" class="compare-username">{{ user2Name }}</router-link>
            <div class="compare-avatar">{{ user2Name[0]?.toUpperCase() }}</div>
          </div>
        </div>
        <p class="compare-subtitle">Figurinhas que cada um pode passar para o outro</p>
      </header>

      <!-- No matches at all -->
      <div
        v-if="user1CanGive.length === 0 && user2CanGive.length === 0"
        class="no-matches"
      >
        <p>😔 Nenhuma troca possível no momento.</p>
        <p class="no-matches-sub">Isso pode acontecer quando nenhum deles tem figurinhas repetidas que o outro precise.</p>
      </div>

      <div class="compare-columns">
        <!-- User1 → User2 -->
        <section class="column">
          <div class="column-header">
            <span class="column-from">{{ user1Name }}</span>
            <span class="column-arrow">→</span>
            <span class="column-to">{{ user2Name }}</span>
          </div>
          <p class="column-desc">
            <template v-if="totalUser1Gives > 0">
              <strong>{{ user1Name }}</strong> tem {{ totalUser1Gives }} figurinha{{ totalUser1Gives !== 1 ? 's' : '' }}
              repetida{{ totalUser1Gives !== 1 ? 's' : '' }} que faltam para <strong>{{ user2Name }}</strong>:
            </template>
            <template v-else>
              <strong>{{ user1Name }}</strong> não tem figurinhas repetidas que faltem para <strong>{{ user2Name }}</strong>.
            </template>
          </p>

          <div v-if="user1CanGive.length > 0" class="match-list">
            <div v-for="group in user1CanGive" :key="group.prefixo" class="match-group">
              <div class="match-group-header">
                <span v-if="group.bandeira.startsWith('/')" class="match-flag-img-wrap">
                  <img :src="group.bandeira" :alt="group.prefixo" class="match-flag-img" />
                </span>
                <span v-else class="match-flag">{{ group.bandeira }}</span>
                <span class="match-country">{{ group.pais }}</span>
                <span class="match-count">{{ group.numeros.length }}x</span>
              </div>
              <div class="match-stickers">
                <span v-for="n in group.numeros" :key="n" class="sticker-chip">
                  {{ group.prefixo }}{{ n }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Divider -->
        <div class="column-divider"></div>

        <!-- User2 → User1 -->
        <section class="column">
          <div class="column-header column-header--reverse">
            <span class="column-from">{{ user2Name }}</span>
            <span class="column-arrow">→</span>
            <span class="column-to">{{ user1Name }}</span>
          </div>
          <p class="column-desc">
            <template v-if="totalUser2Gives > 0">
              <strong>{{ user2Name }}</strong> tem {{ totalUser2Gives }} figurinha{{ totalUser2Gives !== 1 ? 's' : '' }}
              repetida{{ totalUser2Gives !== 1 ? 's' : '' }} que faltam para <strong>{{ user1Name }}</strong>:
            </template>
            <template v-else>
              <strong>{{ user2Name }}</strong> não tem figurinhas repetidas que faltem para <strong>{{ user1Name }}</strong>.
            </template>
          </p>

          <div v-if="user2CanGive.length > 0" class="match-list">
            <div v-for="group in user2CanGive" :key="group.prefixo" class="match-group">
              <div class="match-group-header">
                <span v-if="group.bandeira.startsWith('/')" class="match-flag-img-wrap">
                  <img :src="group.bandeira" :alt="group.prefixo" class="match-flag-img" />
                </span>
                <span v-else class="match-flag">{{ group.bandeira }}</span>
                <span class="match-country">{{ group.pais }}</span>
                <span class="match-count">{{ group.numeros.length }}x</span>
              </div>
              <div class="match-stickers">
                <span v-for="n in group.numeros" :key="n" class="sticker-chip">
                  {{ group.prefixo }}{{ n }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="back-row">
        <button @click="router.back()" class="btn-back">← Voltar</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }

/* Nav */
.compare-nav {
  background: #111;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  position: sticky;
  top: 0;
  z-index: 100;
  font-family: 'Montserrat', sans-serif;
}
.nav-logo {
  font-size: 1.1em;
  font-weight: 900;
  color: #fff;
  text-decoration: none;
  text-transform: uppercase;
}
.nav-right { display: flex; align-items: center; gap: 12px; }
.nav-link { color: #94a3b8; text-decoration: none; font-weight: 700; font-size: 0.85em; font-family: 'Montserrat', sans-serif; }
.nav-link:hover { color: #fff; }
.btn-nav { padding: 6px 14px; background: #fff; color: #111; border: none; border-radius: 8px; font-weight: 700; font-size: 0.8em; cursor: pointer; text-decoration: none; font-family: 'Montserrat', sans-serif; }
.btn-nav-ghost { padding: 6px 14px; background: transparent; color: #94a3b8; border: 1px solid #444; border-radius: 8px; font-weight: 700; font-size: 0.8em; cursor: pointer; font-family: 'Montserrat', sans-serif; }
.btn-nav-ghost:hover { color: #fff; border-color: #fff; }

/* Loading */
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 16px;
  font-family: 'Montserrat', sans-serif;
  color: #64748b;
  font-weight: 600;
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #111;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Page */
.compare-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 60px;
  font-family: 'Montserrat', sans-serif;
}

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 24px;
  text-align: center;
}
.not-found h2 { font-size: 1.8em; font-weight: 900; }
.not-found p { color: #64748b; }

/* Header */
.compare-header {
  text-align: center;
  margin-bottom: 32px;
  background: #fff;
  border-radius: 16px;
  padding: 28px 24px 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  border-top: 6px solid #111;
}
.compare-title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.compare-user {
  display: flex;
  align-items: center;
  gap: 10px;
}
.compare-user--right { flex-direction: row-reverse; }
.compare-avatar {
  width: 52px; height: 52px;
  background: #111;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.4em;
}
.compare-username {
  font-size: 1.5em;
  font-weight: 900;
  color: #111;
  text-decoration: none;
}
.compare-username:hover { text-decoration: underline; }
.compare-vs { font-size: 2em; color: #cbd5e1; }
.compare-subtitle { color: #64748b; font-weight: 600; font-size: 0.9em; }

/* No matches */
.no-matches {
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  border: 2px dashed #e2e8f0;
  font-weight: 700;
  font-size: 1.1em;
}
.no-matches-sub { color: #94a3b8; font-size: 0.85em; font-weight: 600; margin-top: 8px; }

/* Columns */
.compare-columns {
  display: grid;
  grid-template-columns: 1fr 2px 1fr;
  gap: 0 24px;
  align-items: start;
}
.column-divider {
  background: #e2e8f0;
  align-self: stretch;
}
.column { display: flex; flex-direction: column; gap: 16px; }

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #111;
  color: #fff;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 900;
}
.column-from { font-size: 1em; }
.column-arrow { font-size: 1.1em; color: #94a3b8; }
.column-to { font-size: 1em; }

.column-desc {
  font-size: 0.88em;
  color: #475569;
  font-weight: 600;
  line-height: 1.5;
}
.column-desc strong { color: #111; }

/* Match list */
.match-list { display: flex; flex-direction: column; gap: 12px; }
.match-group {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  transition: box-shadow 0.2s;
}
.match-group:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.match-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.match-flag { font-size: 1.4em; }
.match-flag-img-wrap {
  width: 28px; height: 20px;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.match-flag-img { width: 100%; height: 100%; object-fit: cover; }
.match-country { font-weight: 700; font-size: 0.95em; flex: 1; color: #111; }
.match-count {
  background: #f59e0b;
  color: #fff;
  font-weight: 900;
  font-size: 0.75em;
  padding: 2px 8px;
  border-radius: 20px;
}
.match-stickers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sticker-chip {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.75em;
  font-weight: 700;
  color: #334155;
}

/* Back */
.back-row {
  margin-top: 32px;
  display: flex;
  justify-content: center;
}
.btn-back {
  padding: 10px 24px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9em;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  text-decoration: none;
  transition: opacity 0.2s;
}
.btn-back:hover { opacity: 0.8; }

@media (max-width: 700px) {
  .compare-columns {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .column-divider { display: none; }
  .compare-page { padding: 24px 16px 48px; }
}
</style>
