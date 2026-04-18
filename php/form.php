<?php
$date = date("d/m/Y h:i");
$time = ($_POST['time']);

// recebe valores
$seunome = $_POST['seunome'];
$seuemail = $_POST['seuemail'];
$assunto = $_POST['assunto'];
$mensagem = $_POST['mensagem'];

// dados
$seunome_do_site="Loxodonta Game Studio";
$seuemail_para_onde_vai_a_mensagem = "loxodonta@loxodonta.com.br";
$seunome_de_quem_recebe_a_mensagem = "loxodonta.com.br - contato";
$exibir_apos_enviar='erro';
// config
$cabecalho_da_mensagem_original = "From: $seunome <$seuemail>\n";
$assunto_da_mensagem_original = "Nova mensagem do site";

// template
$configuracao_da_mensagem_original="
Em $date, às $time $seuemail escreveu:\n
\nNome: $seunome\n
E-mail: $seuemail\n
Mensagem: $mensagem \n
";

// re: $assunto se $assunto_digitado... "s"
$assunto_da_mensagem_de_resposta = "Confirmação";
$cabecalho_da_mensagem_de_resposta = "From: $seunome_do_site <$seuemail_para_onde_vai_a_mensagem>\n";
$configuracao_da_mensagem_de_resposta="Prezado (a) $seunome,\nObrigado por entrar em contato, \nRetornaremos o mais breve possível.\n\nAtenciosamente,\n$seunome_do_site";
$assunto_digitado_pelo_usuario="s";

//mail() mensagem original
$headers = "$cabecalho_da_mensagem_original";

if($assunto_digitado_pelo_usuario=="s"){
$assunto = "$assunto_da_mensagem_original";
}
$seuemail2 = "$seuemail_para_onde_vai_a_mensagem";
$mensagem = "$configuracao_da_mensagem_original";
mail($seuemail2,$assunto,$mensagem,$headers);

//mail() mensagem automática
$headers = "$cabecalho_da_mensagem_de_resposta";
if($assunto_digitado_pelo_usuario=="n"){
$assunto = "$assunto_da_mensagem_de_resposta";
}else{
$assunto = "Re: loxodonta.com.br - contato";
}

$mensagem = "$configuracao_da_mensagem_de_resposta";
mail($seuemail,$assunto,$mensagem,$headers);

// box #resultado
if($_POST):
	echo 'Contato enviado com sucesso.';
else:
	echo "Erro. Por favor entre em contato com o administrador diretamente: $seuemail_para_onde_vai_a_mensagem";
endif;
?>