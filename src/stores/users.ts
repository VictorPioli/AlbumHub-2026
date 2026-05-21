import { ref } from 'vue'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'

export interface UserRecord {
  nickname: string
  password: string
  phone: string
  albumState: Record<string, { possui: boolean; repetida: boolean }>
  createdAt: string
}

const SESSION_KEY = 'album_current_session'

export const currentUser = ref<string | null>(localStorage.getItem(SESSION_KEY))

// ── Helpers ───────────────────────────────────────────────────

function userDoc(nickname: string) {
  return doc(db, 'users', nickname.toLowerCase())
}

// ── Auth ──────────────────────────────────────────────────────

export async function register(
  nickname: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (nickname.length < 3) return { ok: false, error: 'Nickname muito curto (mín. 3 caracteres)' }
  if (nickname.length > 30) return { ok: false, error: 'Nickname muito longo (máx. 30 caracteres)' }
  if (!/^[a-zA-Z0-9_-]+$/.test(nickname))
    return { ok: false, error: 'Use apenas letras, números, - e _' }
  if (password.length < 4) return { ok: false, error: 'Senha muito curta (mín. 4 caracteres)' }

  try {
    const ref = userDoc(nickname)
    const snap = await getDoc(ref)
    if (snap.exists()) return { ok: false, error: 'Nickname já está em uso' }

    const record: UserRecord = {
      nickname,
      password,
      phone: '',
      albumState: {},
      createdAt: new Date().toISOString(),
    }
    await setDoc(ref, record)

    currentUser.value = nickname
    localStorage.setItem(SESSION_KEY, nickname)
    return { ok: true }
  } catch (e) {
    console.error(e)
    return { ok: false, error: 'Erro ao conectar com o servidor. Tente novamente.' }
  }
}

export async function login(
  nickname: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const snap = await getDoc(userDoc(nickname))
    if (!snap.exists()) return { ok: false, error: 'Usuário não encontrado' }
    const user = snap.data() as UserRecord
    if (user.password !== password) return { ok: false, error: 'Senha incorreta' }

    currentUser.value = user.nickname
    localStorage.setItem(SESSION_KEY, user.nickname)
    return { ok: true }
  } catch (e) {
    console.error(e)
    return { ok: false, error: 'Erro ao conectar com o servidor. Tente novamente.' }
  }
}

export function logout() {
  currentUser.value = null
  localStorage.removeItem(SESSION_KEY)
}

// ── Data ──────────────────────────────────────────────────────

export async function getUser(nickname: string): Promise<UserRecord | null> {
  try {
    const snap = await getDoc(userDoc(nickname))
    if (!snap.exists()) return null
    return snap.data() as UserRecord
  } catch {
    return null
  }
}

export async function saveAlbumState(
  nickname: string,
  state: Record<string, { possui: boolean; repetida: boolean }>
) {
  try {
    await updateDoc(userDoc(nickname), { albumState: state })
  } catch (e) {
    console.error('Erro ao salvar álbum:', e)
  }
}

export async function updatePhone(nickname: string, phone: string) {
  try {
    await updateDoc(userDoc(nickname), { phone })
  } catch (e) {
    console.error('Erro ao salvar telefone:', e)
  }
}

export async function getAllUsers(): Promise<UserRecord[]> {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => d.data() as UserRecord)
  } catch {
    return []
  }
}
