<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser, login, register, logout, getAllUsers } from '../stores/users'
import type { UserRecord } from '../stores/users'
import tacaDaCopa from '../assets/taca-da-copa.png'

const router = useRouter()

const tab = ref<'login' | 'register'>('login')
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const loadingUsers = ref(true)

const users = ref<UserRecord[]>([])

onMounted(async () => {
  if (currentUser.value) {
    router.push(`/${currentUser.value}`)
    return
  }
  users.value = await getAllUsers()
  loadingUsers.value = false
})

const submit = async () => {
  error.value = ''
  loading.value = true
  const nick = nickname.value.trim()
  const pass = password.value

  if (tab.value === 'login') {
    const result = await login(nick, pass)
    if (!result.ok) { error.value = result.error!; loading.value = false; return }
  } else {
    if (pass !== confirmPassword.value) {
      error.value = 'As senhas não coincidem'
      loading.value = false
      return
    }
    const result = await register(nick, pass)
    if (!result.ok) { error.value = result.error!; loading.value = false; return }
  }
  router.push(`/${currentUser.value}`)
  loading.value = false
}

const handleLogout = async () => {
  logout()
  users.value = await getAllUsers()
}

const stickersCount = (user: UserRecord) =>
  Object.values(user.albumState).filter(s => s.possui).length

const repeatedCount = (user: UserRecord) =>
  Object.values(user.albumState).filter(s => s.repetida).length

const joinedDate = (user: UserRecord) =>
  new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
</script>

<template>
  <div class="home-page">
    <header class="home-header">
      <div class="home-header-inner">
        <h1 class="logo">
          <img :src="tacaDaCopa" alt="Copa 2026" class="logo-trophy" />
          Album Copa 2026
        </h1>
        <div v-if="currentUser" class="header-user">
          <span class="header-nick">@{{ currentUser }}</span>
          <router-link :to="`/${currentUser}`" class="btn-header">Meu Perfil</router-link>
          <button @click="handleLogout" class="btn-header btn-header--ghost">Sair</button>
        </div>
      </div>
    </header>

    <main class="home-main">
      <div class="hero">
        <p class="hero-sub">Controle sua coleção, veja repetidas e encontre trocas com outros colecionadores.</p>
      </div>

      <!-- Auth Card -->
      <div v-if="!currentUser" class="auth-card">
        <div class="auth-tabs">
          <button :class="['auth-tab', { active: tab === 'login' }]" @click="tab = 'login'; error = ''; confirmPassword = ''">Entrar</button>
          <button :class="['auth-tab', { active: tab === 'register' }]" @click="tab = 'register'; error = ''; confirmPassword = ''">Criar conta</button>
        </div>

        <form @submit.prevent="submit" class="auth-form">
          <div class="field">
            <label>Nickname</label>
            <input v-model="nickname" type="text" placeholder="hexa2026" autocomplete="username" required />
          </div>
          <div class="field">
            <label>Senha</label>
            <input v-model="password" type="password" placeholder="••••••" autocomplete="current-password" required />
          </div>
          <div v-if="tab === 'register'" class="field">
            <label>Confirmar senha</label>
            <input v-model="confirmPassword" type="password" placeholder="••••••" autocomplete="new-password" required />
          </div>
          <p v-if="loading" class="auth-error" style="color:#64748b">⏳ Conectando...</p>
        <p v-else-if="error" class="auth-error">❌ {{ error }}</p>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ tab === 'login' ? 'Entrar' : 'Criar conta' }}
          </button>
        </form>
      </div>

      <!-- Users list -->
      <section class="users-section">
        <h2 class="section-title">👥 Colecionadores</h2>
        <p v-if="loadingUsers" class="empty-msg">⏳ Carregando colecionadores...</p>
        <p v-else-if="users.length === 0" class="empty-msg">Nenhum perfil cadastrado ainda. Seja o primeiro!</p>
        <div class="users-grid">
          <router-link
            v-for="user in users"
            :key="user.nickname"
            :to="`/${user.nickname}`"
            class="user-card"
          >
            <div class="user-avatar">{{ user.nickname[0].toUpperCase() }}</div>
            <div class="user-info">
              <span class="user-nick">{{ user.nickname }}</span>
              <span class="user-stats">
                ✅ {{ stickersCount(user) }} figurinhas
                <span v-if="repeatedCount(user) > 0"> · 🔄 {{ repeatedCount(user) }} repetidas</span>
              </span>
              <span class="user-joined">desde {{ joinedDate(user) }}</span>
            </div>
            <span class="user-arrow">→</span>
          </router-link>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.home-page {
  min-height: 100vh;
  background: #f4f5f7;
  font-family: 'Montserrat', sans-serif;
  color: #111;
}

/* Header */
.home-header {
  background: rgba(18, 18, 18, 0.86);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.07);
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.home-header-inner {
  max-width: 900px;
  margin: 0 auto;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95em;
  font-weight: 600;
  color: #f5f5f7;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Montserrat', sans-serif;
}
.logo-trophy {
  width: 26px;
  height: 26px;
  object-fit: contain;
}
.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-nick {
  color: rgba(255,255,255,0.5);
  font-size: 0.84em;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Montserrat', sans-serif;
}
.btn-header {
  padding: 5px 14px;
  background: rgba(255,255,255,0.12);
  color: #f5f5f7;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.8em;
  cursor: pointer;
  text-decoration: none;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Montserrat', sans-serif;
  transition: background 0.15s;
}
.btn-header:hover { background: rgba(255,255,255,0.2); opacity: 1; }
.btn-header--ghost {
  background: transparent;
  color: rgba(255,255,255,0.45);
  border: 1px solid rgba(255,255,255,0.15);
}
.btn-header--ghost:hover { color: #f5f5f7; border-color: rgba(255,255,255,0.35); background: transparent; }

/* Main */
.home-main {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px 60px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.hero { text-align: center; }
.hero-sub { color: #64748b; font-size: 1.05em; font-weight: 600; }

/* Auth card */
.auth-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.07);
  padding: 32px;
  max-width: 420px;
  margin: 0 auto;
  width: 100%;
}
.auth-tabs {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 24px;
}
.auth-tab {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  font-weight: 700;
  font-size: 0.9em;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  transition: all 0.2s;
}
.auth-tab.active {
  background: #111;
  color: #fff;
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 0.85em;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.field input {
  padding: 11px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1em;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  transition: border-color 0.2s;
}
.field input:focus { outline: none; border-color: #111; }
.auth-error {
  color: #e3342f;
  font-weight: 700;
  font-size: 0.88em;
}
.btn-primary {
  padding: 13px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 900;
  font-size: 1em;
  font-family: 'Montserrat', sans-serif;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Users section */
.section-title {
  font-size: 1.3em;
  font-weight: 900;
  margin-bottom: 16px;
}
.empty-msg {
  color: #94a3b8;
  font-weight: 600;
  text-align: center;
  padding: 32px;
}
.users-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  border: 2px solid #e2e8f0;
  text-decoration: none;
  color: #111;
  transition: all 0.2s;
}
.user-card:hover {
  border-color: #111;
  transform: translateX(4px);
}
.user-avatar {
  width: 48px;
  height: 48px;
  background: #111;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.4em;
  flex-shrink: 0;
}
.user-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}
.user-nick {
  font-weight: 900;
  font-size: 1.05em;
}
.user-stats {
  font-size: 0.85em;
  font-weight: 600;
  color: #475569;
}
.user-joined {
  font-size: 0.75em;
  color: #94a3b8;
  font-weight: 600;
}
.user-arrow {
  font-size: 1.2em;
  color: #cbd5e1;
  font-weight: 700;
}

@media (max-width: 600px) {
  .home-main { padding: 24px 16px 40px; }
}
</style>
