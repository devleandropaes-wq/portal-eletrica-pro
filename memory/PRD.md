# Portal Elétrica Pro — PRD

## Original problem statement
Aplicação web "Portal Elétrica Pro" para estudantes, técnicos e profissionais de instalações elétricas. Dark mode, Tailwind + Lucide, sidebar separando Admin dos módulos técnicos. Módulos: (1) Autenticação/licenciamento SaaS com roles admin/client, status active/blocked, expires_at, tela "Acesso Expirado / Contate o Administrador"; seeds admin devleandropaes@gmail.com (Le693261*) e cliente Leandro1000cruz@gmail.com (Teste123*, 1 crédito 30 dias); painel admin com lista de clientes, criação de usuário, botão "Adicionar 1 Crédito (+30 dias)", ativar/bloquear. (2) Comandos Elétricos: editor livre drag&drop (disjuntor/fusível, botoeira NA, NF, contator A1-A2/13-14/1-6, relé térmico 95-96, lâmpada, motor trifásico), fios puxados entre terminais, apagar fios/componentes, modo edição/simulação com selo, motor girando, lâmpada, desligar/desarme. (3) Simulador de QDC: disjuntor geral 1P/2P/3P, DR com teste, DPS, divisionais com chaves, monitor de carga e desarme por sobrecarga. (4) Dimensionamento NBR 5410: formulário passo a passo, Ib, bitola mm², disjuntor A, queda de tensão.

User choices: só o admin cria contas; projetos salvos por usuário; símbolos IEC/ABNT.

## Architecture
- Backend FastAPI (server.py): JWT httpOnly cookies (access 8h + refresh 7d), bcrypt, lockout 5 tentativas/15 min por e-mail, require_active (403 expired/blocked), require_admin, coleções users, projects (por user_id), login_attempts.
- Frontend React: AuthContext, RouteGuards, AppLayout (sidebar), pages Login, Expired, Home, Admin, Comandos, Qdc, Dimensionamento, Projetos. Circuit engine em lib/circuitSim.js (union-find + iteração de selo), NBR em lib/nbr5410.js (Tabela 36 B1 PVC, FCA Tabela 42, ρ=1/56).

## Implemented (2026-10-28)
- Todos os 4 módulos + Meus Projetos (salvar/abrir/excluir), exemplo de partida direta, análise de circuito (checklist), detecção de curto.
- Testado E2E (iteration_1): todos os fluxos passaram; correções posteriores: lockout por e-mail, crédito bloqueado para admin, toasts no canto inferior, formatação pt-BR.

## Backlog
- P1: Partida estrela-triângulo / reversora no editor (contatos auxiliares NF do contator, temporizador)
- P1: Exportar diagrama/quadro de cargas em PDF
- P2: Paleta recolhível no mobile; troca de senha pelo usuário; métodos de instalação além de B1
