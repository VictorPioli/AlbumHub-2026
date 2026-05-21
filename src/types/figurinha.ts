export interface Figurinha {
  id: string
  numero: number
  pais: string
  bandeira: string
  possui: boolean
  repetida: boolean
}

export interface PaisFigurinhas {
  pais: string
  prefixo: string
  bandeira: string
  grupo: string
  figurinhas: Figurinha[]
}

export interface Grupo {
  letra: string
  paises: PaisFigurinhas[]
}
