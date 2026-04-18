<?php
$date = date("d/m/Y h:i");

// recebe valores
$emailNews = $_POST['emailNews'];

// dados
$seunome_do_site="Loxodonta Game Studio - newsletter";
$seuemail_para_onde_vai_a_mensagem = "loxodonta@loxodonta.com.br";
$seunome_de_quem_recebe_a_mensagem = "loxodonta.com.br - newsletter";
$exibir_apos_enviar='erro';
// config
$cabecalho_da_mensagem_original = "From: $seunome <$emailNews>\n";
$assunto_da_mensagem_original = "Nova inscrição para newsletter!";

// template
$configuracao_da_mensagem_original="

Um novo e-mail cadastrou-se para receber a newsletter.\n

E-mail: \n $emailNews \n

Inscrito em $date através de $seunome_do_site. \n \n
";

// re: $assunto se $assunto_digitado... "s"
$assunto_da_mensagem_de_resposta = "Confirmação de cadastro";
$cabecalho_da_mensagem_de_resposta = "From: $seunome_do_site <$seuemail_para_onde_vai_a_mensagem>\n";
$configuracao_da_mensagem_de_resposta="Recebemos a sua inscrição para a newsletter do loxodonta game studio. \n\nCom melhores cumprimentos,\n$seunome_do_site";
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
$assunto = "Re: loxodonta.com.br - newsletter";
}

$mensagem = "$configuracao_da_mensagem_de_resposta";
mail($emailNews,$assunto,$mensagem,$headers);

// box #resultado
if($_POST):
	echo 'Em breve receberá as nossas novidades';
else:
	echo "Erro. Por favor entre em contato com o administrador diretamente: $seuemail_para_onde_vai_a_mensagem";
endif;
?>