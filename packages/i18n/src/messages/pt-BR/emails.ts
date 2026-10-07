export const emails = {
  greeting: "Olá, {name}!",
  signature: "Equipe Contraponha",
  verifyEmail: {
    subject: "Confirme seu e-mail no Contraponha",
    body: "Para confirmar seu e-mail e ativar todos os recursos da sua conta, acesse o link abaixo:",
    expiry: "O link vale por {hours} horas.",
    ignore: "Se você não criou uma conta no Contraponha, ignore esta mensagem.",
  },
  passwordReset: {
    subject: "Redefinição de senha do Contraponha",
    body: "Recebemos um pedido para redefinir a senha da sua conta. Para escolher uma nova senha, acesse o link abaixo:",
    expiry: "O link vale por {minutes} minutos e só pode ser usado uma vez.",
    ignore: "Se você não pediu a redefinição, ignore esta mensagem. Sua senha continua a mesma.",
  },
  magicLink: {
    subject: "Seu link para entrar no Contraponha",
    body: "Para entrar na sua conta sem senha, acesse o link abaixo:",
    expiry: "O link vale por {minutes} minutos e só pode ser usado uma vez.",
    ignore:
      "Se você não pediu para entrar, ignore esta mensagem. Ninguém entra na sua conta sem este link.",
  },
  dataExportReady: {
    subject: "Sua exportação de dados do Contraponha está pronta",
    body: "Os dados que você pediu estão prontos. Para baixar, entre na sua conta e acesse Configurações, em Seus dados:",
    expiry: "O arquivo fica disponível por {days} dias.",
    ignore:
      "Se você não pediu esta exportação, troque sua senha e encerre as outras sessões em Configurações.",
  },
}
