import type { PaisFigurinhas, Grupo } from '../types/figurinha'

function criarPais(prefixo: string, pais: string, bandeira: string, grupo: string, quantidade = 20): PaisFigurinhas {
  return {
    pais,
    prefixo,
    bandeira,
    grupo,
    figurinhas: Array.from({ length: quantidade }, (_, i) => ({
      id: `${prefixo}${i + 1}`,
      numero: i + 1,
      pais,
      bandeira,
      possui: false,
      repetida: false,
    })),
  }
}

export const albumData: PaisFigurinhas[] = [
  criarPais('FWC', 'FIFA World Cup', '🏆', 'Especial', 19),
  // Grupo A
  criarPais('MEX', 'México', '/group_a/mexico.webp', 'A'),
  criarPais('RSA', 'África do Sul', '/group_a/south_africa.webp', 'A'),
  criarPais('KOR', 'Coreia do Sul', '/group_a/south_korea.webp', 'A'),
  criarPais('CZE', 'República Tcheca', '/group_a/czech_republic.webp', 'A'),
  // Grupo B
  criarPais('CAN', 'Canadá', '🇨🇦', 'B'),
  criarPais('BIH', 'Bósnia e Herzegovina', '🇧🇦', 'B'),
  criarPais('QAT', 'Catar', '🇶🇦', 'B'),
  criarPais('SUI', 'Suíça', '🇨🇭', 'B'),
  // Grupo C
  criarPais('BRA', 'Brasil', '🇧🇷', 'C'),
  criarPais('MAR', 'Marrocos', '🇲🇦', 'C'),
  criarPais('HAI', 'Haiti', '🇭🇹', 'C'),
  criarPais('SCO', 'Escócia', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C'),
  // Grupo D
  criarPais('USA', 'Estados Unidos', '🇺🇸', 'D'),
  criarPais('PAR', 'Paraguai', '🇵🇾', 'D'),
  criarPais('AUS', 'Austrália', '🇦🇺', 'D'),
  criarPais('TUR', 'Turquia', '🇹🇷', 'D'),
  // Grupo E
  criarPais('GER', 'Alemanha', '🇩🇪', 'E'),
  criarPais('CUW', 'Curaçao', '🇨🇼', 'E'),
  criarPais('CIV', 'Costa do Marfim', '🇨🇮', 'E'),
  criarPais('ECU', 'Equador', '🇪🇨', 'E'),
  // Grupo F
  criarPais('NED', 'Holanda', '🇳🇱', 'F'),
  criarPais('JPN', 'Japão', '🇯🇵', 'F'),
  criarPais('SWE', 'Suécia', '🇸🇪', 'F'),
  criarPais('TUN', 'Tunísia', '🇹🇳', 'F'),
  // Grupo G
  criarPais('BEL', 'Bélgica', '🇧🇪', 'G'),
  criarPais('EGY', 'Egito', '🇪🇬', 'G'),
  criarPais('IRN', 'Irã', '🇮🇷', 'G'),
  criarPais('NZL', 'Nova Zelândia', '🇳🇿', 'G'),
  // Grupo H
  criarPais('ESP', 'Espanha', '🇪🇸', 'H'),
  criarPais('CPV', 'Cabo Verde', '🇨🇻', 'H'),
  criarPais('KSA', 'Arábia Saudita', '🇸🇦', 'H'),
  criarPais('URU', 'Uruguai', '🇺🇾', 'H'),
  // Grupo I
  criarPais('FRA', 'França', '🇫🇷', 'I'),
  criarPais('SEN', 'Senegal', '🇸🇳', 'I'),
  criarPais('IRQ', 'Iraque', '🇮🇶', 'I'),
  criarPais('NOR', 'Noruega', '🇳🇴', 'I'),
  // Grupo J
  criarPais('ARG', 'Argentina', '🇦🇷', 'J'),
  criarPais('ALG', 'Argélia', '🇩🇿', 'J'),
  criarPais('AUT', 'Áustria', '🇦🇹', 'J'),
  criarPais('JOR', 'Jordânia', '🇯🇴', 'J'),
  // Grupo K
  criarPais('POR', 'Portugal', '🇵🇹', 'K'),
  criarPais('COD', 'Rep. Dem. Congo', '🇨🇩', 'K'),
  criarPais('UZB', 'Uzbequistão', '🇺🇿', 'K'),
  criarPais('COL', 'Colômbia', '🇨🇴', 'K'),
  // Grupo L
  criarPais('ENG', 'Inglaterra', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L'),
  criarPais('CRO', 'Croácia', '🇭🇷', 'L'),
  criarPais('GHA', 'Gana', '🇬🇭', 'L'),
  criarPais('PAN', 'Panamá', '🇵🇦', 'L'),
  // Especiais
  criarPais('CC', 'Copa Centenário', '🌎', 'Especial', 14),
]

export const grupos: Grupo[] = [
  ...['A','B','C','D','E','F','G','H','I','J','K','L'].map(letra => ({
    letra,
    paises: albumData.filter(p => p.grupo === letra),
  })),
  { letra: 'Especial', paises: albumData.filter(p => p.grupo === 'Especial') },
]

