<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentUser, logout, getUser, getAllUsers, updatePhone } from '../stores/users'
import { albumData } from '../data/album'
import AlbumControle from '../components/AlbumControle.vue'
import type { UserRecord } from '../stores/users'

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
    u => u.nickname.toLowerCase() !== nickname.value.toLowerCase()
  )
  loadingProfile.value = false
  if (profileUser.value) {
    phoneEdit.value = profileUser.value.phone ?? ''
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
  if (compareWith.value) {
    router.push(`/compare/${nickname.value}/${compareWith.value}`)
  }
}

// ── Phone edit ────────────────────────────────────────────────
const phoneEdit = ref('')
const editingPhone = ref(false)
const savingPhone = ref(false)

const savePhone = async () => {
  if (!profileUser.value) return
  savingPhone.value = true
  await updatePhone(profileUser.value.nickname, phoneEdit.value.trim())
  profileUser.value.phone = phoneEdit.value.trim()
  savingPhone.value = false
  editingPhone.value = false
}

// ── WhatsApp link ─────────────────────────────────────────────
const whatsappLink = computed(() => {
  const user = profileUser.value
  if (!user?.phone) return null

  const grouped: Record<string, { nums: number[]; bandeira: string }> = {}
  for (const [id, s] of Object.entries(user.albumState)) {
    if (!s.repetida) continue
    const match = id.match(/^([A-Z]+)(\d+)$/)
    if (!match) continue
    const prefixo = match[1]
    const numero = parseInt(match[2])
    if (!grouped[prefixo]) {
      const paisData = albumData.find(p => p.prefixo === prefixo)
      const bandeira = paisData?.bandeira ?? ''
      grouped[prefixo] = { nums: [], bandeira }
    }
    grouped[prefixo].nums.push(numero)
  }

  const lines: string[] = ['Olá, vi que você tem essas figurinhas:']
  for (const [prefixo, { nums, bandeira }] of Object.entries(grouped).sort()) {
    const flag = bandeira.startsWith('/') ? '' : `${bandeira} `
    lines.push(`${flag}${prefixo}: ${nums.sort((a, b) => a - b).join(', ')}`)
  }
  lines.push('Bora fazer um rolo?')

  const phone = user.phone.replace(/\D/g, '')
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`
})
</script>

<template>
  <!-- Top nav -->
  <nav class="profile-nav">
    <router-link to="/" class="nav-logo">⚽ Album Copa 2026</router-link>
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

          <!-- Phone: owner can edit, visitors see WhatsApp button -->
          <div class="phone-row" v-if="isOwner">
            <template v-if="editingPhone">
              <input
                v-model="phoneEdit"
                type="tel"
                placeholder="Ex: 5511999999999"
                class="phone-input"
                @keyup.enter="savePhone"
              />
              <button @click="savePhone" :disabled="savingPhone" class="btn-phone-save">
                {{ savingPhone ? '⏳' : '✅ Salvar' }}
              </button>
              <button @click="editingPhone = false" class="btn-phone-cancel">Cancelar</button>
            </template>
            <template v-else>
              <span class="phone-display">
                📱 {{ profileUser.phone ? profileUser.phone : 'Nenhum telefone cadastrado' }}
              </span>
              <button @click="editingPhone = true; phoneEdit = profileUser.phone ?? ''" class="btn-phone-edit">
                ✏️ {{ profileUser.phone ? 'Editar' : 'Adicionar' }}
              </button>
            </template>
          </div>
          <div v-else-if="whatsappLink" class="phone-row">
            <a :href="whatsappLink" target="_blank" class="btn-whatsapp">
              💬 Propor troca no WhatsApp
            </a>
          </div>
        </div>

        <!-- Compare selector -->
        <div v-if="allUsers.length > 0" class="compare-box">
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
  letter-spacing: -0.5px;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nav-link {
  color: #94a3b8;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.85em;
  font-family: 'Montserrat', sans-serif;
}
.nav-link:hover { color: #fff; }
.btn-nav {
  padding: 6px 14px;
  background: #fff;
  color: #111;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8em;
  cursor: pointer;
  text-decoration: none;
  font-family: 'Montserrat', sans-serif;
}
.btn-nav-ghost {
  padding: 6px 14px;
  background: transparent;
  color: #94a3b8;
  border: 1px solid #444;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8em;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  transition: all 0.2s;
}
.btn-nav-ghost:hover { color: #fff; border-color: #fff; }

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
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  font-family: 'Montserrat', sans-serif;
}
.profile-banner-inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.profile-avatar {
  width: 64px;
  height: 64px;
  background: #111;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.8em;
  flex-shrink: 0;
}
.profile-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.profile-nickname {
  font-size: 1.6em;
  font-weight: 900;
  color: #111;
}
.profile-joined {
  font-size: 0.82em;
  color: #94a3b8;
  font-weight: 600;
}

/* Phone */
.phone-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.phone-display {
  font-size: 0.85em;
  font-weight: 600;
  color: #475569;
}
.phone-input {
  padding: 6px 10px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.88em;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  width: 190px;
}
.phone-input:focus { outline: none; border-color: #111; }
.btn-phone-save {
  padding: 6px 12px;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8em;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
}
.btn-phone-cancel {
  padding: 6px 12px;
  background: transparent;
  color: #94a3b8;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8em;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
}
.btn-phone-edit {
  padding: 4px 10px;
  background: transparent;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.75em;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  transition: all 0.2s;
}
.btn-phone-edit:hover { border-color: #111; color: #111; }
.btn-whatsapp {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #25d366;
  color: #fff;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.85em;
  text-decoration: none;
  font-family: 'Montserrat', sans-serif;
  transition: opacity 0.2s;
  margin-top: 4px;
}
.btn-whatsapp:hover { opacity: 0.85; }
.compare-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.compare-label {
  font-size: 0.8em;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.compare-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.compare-select {
  padding: 9px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9em;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  background: #fff;
  cursor: pointer;
  min-width: 160px;
}
.compare-select:focus { outline: none; border-color: #111; }
.btn-compare {
  padding: 9px 16px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.85em;
  cursor: pointer;
  white-space: nowrap;
  font-family: 'Montserrat', sans-serif;
  transition: opacity 0.2s;
}
.btn-compare:hover { opacity: 0.8; }
.btn-compare:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 600px) {
  .profile-banner-inner { padding: 20px 16px; }
}
</style>
