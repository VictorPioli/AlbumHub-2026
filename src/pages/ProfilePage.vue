<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentUser, logout, getUser, getAllUsers } from '../stores/users'
import AlbumControle from '../components/AlbumControle.vue'
import type { UserRecord } from '../stores/users'
import tacaDaCopa from '../assets/taca-da-copa.png'

const route = useRoute()
const router = useRouter()

const nickname = computed(() => route.params.nickname as string)
const profileUser = ref<UserRecord | null>(null)
const notFound = ref(false)
const loadingProfile = ref(true)
const allUsers = ref<UserRecord[]>([])

const loadProfile = async () => {
  loadingProfile.value = true
  notFound.value = false
  profileUser.value = await getUser(nickname.value)
  notFound.value = !profileUser.value
  allUsers.value = (await getAllUsers()).filter(
    u => u.nickname.toLowerCase() !== (currentUser.value?.toLowerCase() ?? '\x00')
  )
  loadingProfile.value = false
  // Pre-select the profile user when visiting someone else's page
  if (currentUser.value && !isOwner.value && profileUser.value) {
    compareWith.value = profileUser.value.nickname
  }
}

onMounted(loadProfile)
watch(nickname, loadProfile)

const isOwner = computed(
  () => currentUser.value?.toLowerCase() === nickname.value.toLowerCase()
)

const handleLogout = () => {
  logout()
  router.push('/')
}

const compareWith = ref('')
const startCompare = () => {
  if (compareWith.value && currentUser.value) {
    router.push(`/compare/${currentUser.value}/${compareWith.value}`)
  }
}


</script>

<template>
  <!-- Top nav -->
  <nav class="profile-nav">
    <router-link to="/" class="nav-logo">
      <img :src="tacaDaCopa" alt="Copa 2026" class="nav-trophy" />
      Album Copa 2026
    </router-link>
    <div class="nav-right">
      <template v-if="currentUser">
        <router-link :to="`/${currentUser}`" class="nav-link">@{{ currentUser }}</router-link>
        <button @click="handleLogout" class="btn-nav-ghost">Sair</button>
      </template>
      <router-link v-else to="/" class="btn-nav">Entrar</router-link>
    </div>
  </nav>

  <!-- Loading -->
  <div v-if="loadingProfile" class="loading-screen">
    <div class="loading-spinner"></div>
    <p>Carregando perfil...</p>
  </div>

  <!-- Not found -->
  <div v-else-if="notFound" class="not-found">
    <h2>😕 Perfil não encontrado</h2>
    <p>O usuário <strong>{{ nickname }}</strong> não existe.</p>
    <router-link to="/" class="btn-primary">← Voltar</router-link>
  </div>

  <template v-else-if="profileUser">
    <!-- Profile header -->
    <div class="profile-banner">
      <div class="profile-banner-inner">
        <div class="profile-avatar">{{ profileUser.nickname[0].toUpperCase() }}</div>
        <div class="profile-meta">
          <h1 class="profile-nickname">{{ profileUser.nickname }}</h1>
          <span class="profile-joined">
            Membro desde {{ new Date(profileUser.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }}
          </span>


        </div>

        <!-- Compare selector -->
        <div v-if="currentUser && allUsers.length > 0" class="compare-box">
          <label class="compare-label">Comparar trocas com:</label>
          <div class="compare-row">
            <select v-model="compareWith" class="compare-select">
              <option value="">Selecione um usuário</option>
              <option v-for="u in allUsers" :key="u.nickname" :value="u.nickname">
                {{ u.nickname }}
              </option>
            </select>
            <button
              @click="startCompare"
              :disabled="!compareWith"
              class="btn-compare"
            >
              🔄 Ver trocas
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Album -->
    <AlbumControle
      :username="profileUser.nickname"
      :can-edit="isOwner"
    />
  </template>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }

/* Nav */
.profile-nav {
  background: rgba(18, 18, 18, 0.86);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.07);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 52px;
  position: sticky;
  top: 0;
  z-index: 100;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Montserrat', sans-serif;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95em;
  font-weight: 600;
  color: #f5f5f7;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.nav-trophy {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nav-link {
  color: rgba(255,255,255,0.5);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.84em;
  font-family: inherit;
  transition: color 0.15s;
}
.nav-link:hover { color: #f5f5f7; }
.btn-nav {
  padding: 5px 14px;
  background: rgba(255,255,255,0.12);
  color: #f5f5f7;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.8em;
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-nav:hover { background: rgba(255,255,255,0.2); }
.btn-nav-ghost {
  padding: 5px 14px;
  background: transparent;
  color: rgba(255,255,255,0.45);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.8em;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.btn-nav-ghost:hover { color: #f5f5f7; border-color: rgba(255,255,255,0.35); }

/* Loading */
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
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

/* Not found */
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  font-family: 'Montserrat', sans-serif;
  text-align: center;
  padding: 24px;
}
.not-found h2 { font-size: 1.8em; font-weight: 900; }
.not-found p { color: #64748b; }
.btn-primary {
  padding: 10px 24px;
  background: #111;
  color: #fff;
  border-radius: 10px;
  font-weight: 700;
  text-decoration: none;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.9em;
}

/* Profile banner */
.profile-banner {
  background: #f5f5f7;
  border-bottom: 1px solid rgba(0,0,0,0.07);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Montserrat', sans-serif;
}
.profile-banner-inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 24px;
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.profile-avatar {
  width: 54px;
  height: 54px;
  background: #e8e8ed;
  color: #1d1d1f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.4em;
  flex-shrink: 0;
  letter-spacing: -1px;
}
.profile-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.profile-nickname {
  font-size: 1.35em;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.3px;
}
.profile-joined {
  font-size: 0.79em;
  color: #86868b;
  font-weight: 400;
}

.compare-box {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.compare-label {
  font-size: 0.72em;
  font-weight: 500;
  color: #86868b;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.compare-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.compare-select {
  padding: 8px 12px;
  border: 1px solid rgba(0,0,0,0.14);
  border-radius: 10px;
  font-size: 0.86em;
  font-family: inherit;
  font-weight: 400;
  background: #fff;
  cursor: pointer;
  min-width: 160px;
  color: #1d1d1f;
}
.compare-select:focus { outline: none; border-color: #1d1d1f; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }
.btn-compare {
  padding: 8px 18px;
  background: #1d1d1f;
  color: #f5f5f7;
  border: none;
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.82em;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: opacity 0.15s;
}
.btn-compare:hover { opacity: 0.8; }
.btn-compare:disabled { opacity: 0.35; cursor: not-allowed; }

@media (max-width: 600px) {
  .profile-banner-inner { padding: 20px 16px; }
}
</style>
