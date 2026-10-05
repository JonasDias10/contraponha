export const emails = {
  greeting: "Olá, {name}!",
  signature: "Equipe Ponto",
  verifyEmail: {
    subject: "Confirme seu e-mail no Ponto",
    body: "Para confirmar seu e-mail e ativar todos os recursos da sua conta, acesse o link abaixo:",
    expiry: "O link vale por {hours} horas.",
    ignore: "Se você não criou uma conta no Ponto, ignore esta mensagem.",
  },
  passwordReset: {
    subject: "Redefinição de senha do Ponto",
    body: "Recebemos um pedido para redefinir a senha da sua conta. Para escolher uma nova senha, acesse o link abaixo:",
    expiry: "O link vale por {minutes} minutos e só pode ser usado uma vez.",
    ignore: "Se você não pediu a redefinição, ignore esta mensagem. Sua senha continua a mesma.",
  },
}
