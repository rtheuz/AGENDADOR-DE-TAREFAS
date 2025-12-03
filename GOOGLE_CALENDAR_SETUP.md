# Configuração da Integração com Google Calendar

## ⚠️ IMPORTANTE: Use um Servidor Local

**NÃO abra o arquivo `index.html` diretamente pelo sistema de arquivos!**

A API do Google Calendar requer HTTPS ou `http://localhost`. Abrir o arquivo diretamente (`file://`) causará erros de CORS e "Invalid cookiePolicy".

**Sempre use um servidor local:**
- Windows: Execute `start-server.bat`
- Linux/Mac: Execute `./start-server.sh`
- Ou use: `python -m http.server 8000`
- Acesse: `http://localhost:8000`

---

Para usar a integração com Google Calendar, você precisa configurar as credenciais da API do Google.

## Passo 1: Criar um Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Google Calendar API**:
   - Vá em "APIs e Serviços" > "Biblioteca"
   - Procure por "Google Calendar API"
   - Clique em "Ativar"

## Passo 2: Criar Credenciais OAuth 2.0

1. Vá em "APIs e Serviços" > "Credenciais"
2. Clique em "Criar credenciais" > "ID do cliente OAuth"
3. Configure a tela de consentimento OAuth (se necessário)
4. Escolha "Aplicativo da Web" como tipo de aplicativo
5. Adicione as URLs autorizadas:
   - **Origens JavaScript autorizadas**: `http://localhost` (para desenvolvimento) ou seu domínio
   - **URIs de redirecionamento autorizados**: `http://localhost` ou seu domínio
6. Copie o **ID do Cliente** gerado

## Passo 3: Criar uma Chave de API

1. Ainda em "Credenciais", clique em "Criar credenciais" > "Chave de API"
2. Copie a chave gerada

## Passo 4: Configurar no Código

Abra o arquivo `js/google-calendar.js` e substitua:

```javascript
apiKey: this.apiKey || 'YOUR_API_KEY', // Substitua pela sua API key
clientId: this.clientId || 'YOUR_CLIENT_ID', // Substitua pelo seu Client ID
```

Por suas credenciais reais:

```javascript
apiKey: this.apiKey || 'SUA_CHAVE_API_AQUI',
clientId: this.clientId || 'SEU_CLIENT_ID_AQUI',
```

## Passo 5: Testar

1. Abra o aplicativo no navegador
2. Clique em "Conectar Google Calendar"
3. Faça login com sua conta Google
4. Autorize o acesso ao Google Calendar
5. Pronto! Agora você pode sincronizar suas tarefas

## Funcionalidades

- ✅ Criar eventos no Google Calendar automaticamente
- ✅ Atualizar eventos quando você edita uma tarefa
- ✅ Excluir eventos quando você exclui uma tarefa
- ✅ Sincronização manual de todas as tarefas
- ✅ Lembretes configurados automaticamente

## Notas Importantes

- As credenciais são armazenadas localmente no navegador
- Você pode desconectar a qualquer momento
- Os eventos são criados no calendário principal (primary)
- As cores dos eventos refletem a prioridade da tarefa:
  - 🔴 Alta: Vermelho
  - 🟡 Média: Amarelo
  - 🟢 Baixa: Verde

## Solução de Problemas

**Erro: "API key not valid"**
- Verifique se a chave de API está correta
- Certifique-se de que a Google Calendar API está ativada

**Erro: "Client ID not valid"**
- Verifique se o Client ID está correto
- Certifique-se de que as URLs autorizadas estão configuradas corretamente

**Notificações não funcionam com app fechado**
- Certifique-se de que o Service Worker está registrado
- Verifique as permissões de notificação no navegador
- No Chrome, vá em Configurações > Privacidade > Notificações

