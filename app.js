const API_URL = 'http://192.168.0.6:8080/api/pdv';
let carrinho = [];
let historicoVendas = [];
let produtoAtualTemp = null;
let produtosCadastradosDoBanco = [];
let totalGlobalVenda = 0;
let acumuladoFaturado = 0;

const campoCodigo = document.getElementById('codigoBarras');
const areaQuantidade = document.getElementById('area-quantidade');
const nomeProdutoEncontrado = document.getElementById('nome-produto-encontrado');
const campoQuantidade = document.getElementById('quantidade');
const modalCadastro = document.getElementById('modalCadastro');

window.onload = function () {
    carregarProdutosDoBanco();
    verificarFormaPagamento();
};

function verificarFormaPagamento() {
    const forma = document.getElementById('formaPagamento').value;
    const camposDinamicos = document.querySelectorAll('.secao-dinheiro-dinamica');

    camposDinamicos.forEach(div => {
        if (forma === 'Dinheiro') {
            div.style.display = 'flex';
        } else {
            div.style.display = 'none';
        }
    });

    document.getElementById('valorRecebido').value = '';
    document.getElementById('valorTroco').value = 'R$ 0.00';
}

function calcularTroco() {
    const valorRecebidoInput = document.getElementById('valorRecebido').value;
    const campoTroco = document.getElementById('valorTroco');

    if (!valorRecebidoInput || isNaN(valorRecebidoInput)) {
        campoTroco.value = 'R$ 0.00';
        return;
    }

    const recebido = parseFloat(valorRecebidoInput);
    const troco = recebido - totalGlobalVenda;

    if (troco < 0) {
        campoTroco.value = "Falta R$ " + Math.abs(troco).toFixed(2);
    } else {
        campoTroco.value = "R$ " + troco.toFixed(2);
    }
}

function carregarProdutosDoBanco() {
    fetch(`${API_URL}/produtos`)
        .then(res => res.json())
        .then(produtos => {
            produtosCadastradosDoBanco = produtos;
            renderizarListaLateral();
        })
        .catch(err => console.error("Erro ao carregar lista de produtos:", err));
}

function renderizarListaLateral() {
    const containerListaRapida = document.getElementById('lista-produtos-rapidos');
    containerListaRapida.innerHTML = '';

    if (produtosCadastradosDoBanco.length === 0) {
        containerListaRapida.innerHTML = '<p style="padding:10px; color:#999;">Nenhum produto cadastrado.</p>';
        return;
    }

    produtosCadastradosDoBanco.forEach((prod, index) => {
        containerListaRapida.innerHTML += `
            <div class="item-rapido">
                <input type="checkbox" id="chk-${index}" value="${index}" onchange="controlarBotaoPronto()">
                <label for="chk-${index}">
                    <strong>${prod.nome}</strong><br>
                    <span style="font-size:13px; color:#28a745;">R$ ${prod.preco.toFixed(2)}</span>
                </label>
                <input type="number" id="qtd-${index}" value="1" min="1" disabled style="padding: 5px; font-size:14px;">
            </div>
        `;
    });
    controlarBotaoPronto();
}

function controlarBotaoPronto() {
    let algumSelecionado = false;
    const btnPronto = document.getElementById('btn-pronto');

    produtosCadastradosDoBanco.forEach((_, index) => {
        const chk = document.getElementById(`chk-${index}`);
        const qtdInput = document.getElementById(`qtd-${index}`);

        if (chk && chk.checked) {
            if (qtdInput) qtdInput.disabled = false;
            algumSelecionado = true;
        } else {
            if (qtdInput) {
                qtdInput.disabled = true;
                qtdInput.value = "1";
            }
        }
    });

    if (btnPronto) {
        btnPronto.style.display = algumSelecionado ? 'block' : 'none';
    }
}

function inserirSelecionadosNoCarrinho() {
    produtosCadastradosDoBanco.forEach((prod, index) => {
        const chk = document.getElementById(`chk-${index}`);
        const qtdInput = document.getElementById(`qtd-${index}`);
        if (chk && chk.checked) {
            const qtd = parseInt(qtdInput.value);
            if (qtd > 0) {
                carrinho.push({ nome: prod.nome, quantidade: qtd, precoUnitario: prod.preco });
            }
        }
    });
    atualizarInterfaceCarrinho();
    carregarProdutosDoBanco();
}

function alterarQuantidadeCarrinho(index, novaQuantidade) {
    const qtd = parseInt(novaQuantidade);
    if (qtd <= 0 || isNaN(qtd)) {
        excluirItemCarrinho(index);
        return;
    }
    carrinho[index].quantidade = qtd;
    atualizarInterfaceCarrinho();
}

function excluirItemCarrinho(index) {
    carrinho.splice(index, 1);
    atualizarInterfaceCarrinho();
}

function atualizarInterfaceCarrinho() {
    const corpoTabela = document.getElementById('corpo-tabela');
    corpoTabela.innerHTML = '';
    totalGlobalVenda = 0;

    carrinho.forEach((item, index) => {
        const totalItem = item.quantidade * item.precoUnitario;
        totalGlobalVenda += totalItem;

        corpoTabela.innerHTML += `<tr>
            <td>${item.nome}</td>
            <td>
                <input type="number" class="input-qtd-tabela" min="1" value="${item.quantidade}" 
                onchange="alterarQuantidadeCarrinho(${index}, this.value)">
            </td>
            <td>R$ ${item.precoUnitario.toFixed(2)}</td>
            <td>R$ ${totalItem.toFixed(2)}</td>
            <td>
                <button class="btn-excluir" onclick="excluirItemCarrinho(${index})">Remover</button>
            </td>
        </tr>`;
    });

    document.getElementById('total-geral').textContent = totalGlobalVenda.toFixed(2);
    calcularTroco();
}

// --- ATUALIZADO: EXIBE A FORMA DE PAGAMENTO NA TABELA DE HISTÓRICO ---
function atualizarInterfaceHistorico() {
    const corpoHistorico = document.getElementById('corpo-historico');
    corpoHistorico.innerHTML = '';
    acumuladoFaturado = 0;

    historicoVendas.forEach(item => {
        const totalItem = item.quantidade * item.precoUnitario;
        acumuladoFaturado += totalItem;

        corpoHistorico.innerHTML += `<tr>
            <td><strong>${item.nome}</strong></td>
            <td>${item.quantidade}</td>
            <td>R$ ${totalItem.toFixed(2)}</td>
            <td><span class="badge-pagamento">${item.formaPagamento}</span></td> </tr>`;
    });

    document.getElementById('total-faturado-valor').textContent = acumuladoFaturado.toFixed(2);
}

campoCodigo.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        buscarProduto(campoCodigo.value);
    }
});

function buscarProduto(codigo) {
    if (!codigo) return;
    fetch(`${API_URL}/bipar/${codigo}`)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(produto => {
            produtoAtualTemp = produto;
            nomeProdutoEncontrado.textContent = `${produto.nome} - R$ ${produto.precoUnitario.toFixed(2)}`;
            areaQuantidade.style.display = 'block';
            campoQuantidade.focus();
            campoQuantidade.select();
        })
        .catch(() => { alert('Produto não cadastrado!'); limparBusca(); });
}

function adicionarAoCarrinho() {
    const qtd = parseInt(campoQuantidade.value);
    if (qtd <= 0 || isNaN(qtd)) return;
    carrinho.push({ nome: produtoAtualTemp.nome, quantidade: qtd, precoUnitario: produtoAtualTemp.precoUnitario });
    atualizarInterfaceCarrinho();
    limparBusca();
}

function limparBusca() {
    campoCodigo.value = '';
    areaQuantidade.style.display = 'none';
    produtoAtualTemp = null;
    campoQuantidade.value = '1';
    campoCodigo.focus();
}

function abrirModalCadastro() {
    modalCadastro.style.display = 'block';
    document.getElementById('cadCodigo').focus();
}

function fecharModalCadastro() {
    modalCadastro.style.display = 'none';
    document.getElementById('cadCodigo').value = '';
    document.getElementById('cadNome').value = '';
    document.getElementById('cadPreco').value = '';
    campoCodigo.focus();
}

function salvarProdutoNoBanco() {
    const codigo = document.getElementById('cadCodigo').value;
    const nome = document.getElementById('cadNome').value;
    const preco = parseFloat(document.getElementById('cadPreco').value);
    if (!codigo || !nome || isNaN(preco)) return;

    fetch(`${API_URL}/produtos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoBarras: codigo, nome: nome, preco: preco })
    })
        .then(response => {
            if (response.ok) {
                alert('Produto cadastrado!');
                fecharModalCadastro();
                carregarProdutosDoBanco();
            }
        });
}

// --- ATUALIZADO: CAPTURA A FORMA DE PAGAMENTO E ATRIBUI AOS ITENS ---
// Altere a função finalizarVenda para trabalhar apenas localmente
function finalizarVenda() {
    if (carrinho.length === 0) return;

    const forma = document.getElementById('formaPagamento').value;
    if (forma === 'Dinheiro') {
        const recebido = parseFloat(document.getElementById('valorRecebido').value || 0);
        if (recebido < totalGlobalVenda) {
            alert('O valor recebido é menor do que o total da venda!');
            return;
        }
    }

    // Apenas move os itens do carrinho local para o histórico da tela
    carrinho.forEach(item => {
        historicoVendas.push({
            nome: item.nome,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            formaPagamento: forma
        });
    });

    atualizarInterfaceHistorico();

    // Reseta o carrinho local para a próxima venda
    carrinho = [];
    atualizarInterfaceCarrinho();
    limparBusca();
    document.getElementById('valorRecebido').value = '';
    document.getElementById('valorTroco').value = 'R$ 0.00';

    alert('Pedido adicionado ao histórico do dia!');
}

// NOVA FUNÇÃO: DISPARADA APENAS NO FIM DO DIA OU QUANDO VOCÊ CLICAR NO BOTÃO
function gerarRelatorioDiario() {
    if (historicoVendas.length === 0) {
        alert('Não há vendas registradas no histórico para gerar o relatório!');
        return;
    }

    if (!confirm('Deseja encerrar o expediente e gerar a planilha Excel com todas as vendas de hoje?')) {
        return;
    }

    // Criamos um objeto simulando a VendaDTO, mas enviando a lista completa do dia
    // Como a forma de pagamento agora varia por item, enviamos uma string geral "Múltiplas" ou tratamos no Java
    const dadosFechamento = {
        itens: historicoVendas,
        formaPagamento: "Relatório Diário"
    };

    fetch(`${API_URL}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosFechamento)
    })
        .then(response => {
            if (!response.ok) throw new Error('Erro ao gerar planilha');
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            const dataAtual = new Date().toISOString().split('T')[0]; // Pega apenas AAAA-MM-DD
            a.download = `fechamento_caixa_${dataAtual}.xlsx`;

            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            alert('Relatório diário baixado com sucesso! Caixa do dia encerrado.');

            // Limpa o histórico da tela para o próximo dia de trabalho
            historicoVendas = [];
            atualizarInterfaceHistorico();
        })
        .catch(err => {
            console.error(err);
            alert('Houve um problema ao gerar o relatório consolidado.');
        });
}

// NOVA FUNÇÃO: Máscara que transforma digitação em formato de moeda (Ex: 1234 -> 12,34)
function aplicarMascaraMoeda(input) {
    // Remove tudo o que não for dígito numérico
    let valor = input.value.replace(/\D/g, "");

    // Se estiver vazio, define como zero formatado
    if (valor === "") {
        input.value = "";
        return;
    }

    // Transforma em centavos dividindo por 100
    valor = (parseFloat(valor) / 100).toFixed(2);

    // Substitui o ponto por vírgula para exibir no padrão brasileiro (opcional para o visual)
    // Mas para manter compatibilidade com o parseFloat do banco, vamos manter o ponto no 'value'
    // e apenas exibir mascarado se preferir. Para não quebrar seus cálculos atuais de parseFloat,
    // vamos manter o ponto decimal padrão:
    input.value = valor;
}
