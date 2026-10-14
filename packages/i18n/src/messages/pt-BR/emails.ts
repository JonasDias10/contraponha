export const emails = {
  greeting: "Olá, {name}!",
  signature: "Equipe Contraponha",
  linkFallback: "Se o botão não funcionar, copie e cole este endereço no navegador:",
  footer: "Você recebeu este e-mail por causa da sua conta no Contraponha.",
  tagline: "Conversas que valem a pena.",
  verifyEmail: {
    subject: "Confirme seu e-mail no Contraponha",
    title: "Confirme seu e-mail",
    body: "Para confirmar seu e-mail e ativar todos os recursos da sua conta, use o botão abaixo.",
    action: "Confirmar e-mail",
    expiry: "O link vale por {hours} horas.",
    ignore: "Se você não criou uma conta no Contraponha, ignore esta mensagem.",
  },
  passwordReset: {
    subject: "Redefinição de senha do Contraponha",
    title: "Redefina sua senha",
    body: "Recebemos um pedido para redefinir a senha da sua conta. Para escolher uma nova senha, use o botão abaixo.",
    action: "Escolher nova senha",
    expiry: "O link vale por {minutes} minutos e só pode ser usado uma vez.",
    ignore: "Se você não pediu a redefinição, ignore esta mensagem. Sua senha continua a mesma.",
  },
  dataExportReady: {
    subject: "Sua exportação de dados do Contraponha está pronta",
    title: "Seus dados estão prontos",
    body: "Os dados que você pediu estão prontos. Para baixar, entre na sua conta e acesse Configurações, em Seus dados.",
    action: "Abrir Seus dados",
    expiry: "O arquivo fica disponível por {days} dias.",
    ignore:
      "Se você não pediu esta exportação, troque sua senha e encerre as outras sessões em Configurações.",
  },
  deletionCancelled: {
    subject: "A exclusão da sua conta do Contraponha foi cancelada",
    title: "Sua conta não será mais excluída",
    body: "Alguém entrou na sua conta durante o prazo de 30 dias, então a exclusão que estava agendada foi cancelada.",
    action: "Abrir Conta",
    expiry: "Se ainda quiser excluir a conta, peça de novo em Configurações, em Seus dados.",
    ignore:
      "Se não foi você quem entrou, troque sua senha e encerre as outras sessões em Configurações.",
  },
}
