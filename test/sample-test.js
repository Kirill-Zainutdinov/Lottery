const { inputToConfig } = require("@ethereum-waffle/compiler");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lottery", function(){
  
  let Lottery;
  let lottery;
  let player1;
  let player2;

  // деплоим контракт
  before(async function(){
    // Собрали контракт
    Lottery = await ethers.getContractFactory("Lottery");
    // Отправили контракт в деплой
    lottery = await Lottery.deploy();
    // подождали, пока контракт задеплоился
    await lottery.deployed();
    // сохранили два адреса
    [player1, player2] = await ethers.getSigners();
  })

  // проверка, что ставка ставиться
  it("Making a bet", async function(){

    // размер ставки
    const bet = 1234567;

    // Узнаём текущий баланс контракта 
    const contractBalance = await ethers.provider.getBalance(lottery.address);

    // player1 делает ставку
    const tx = await lottery.connect(player1).bet({value: bet});
    await tx.wait();

    // проверяем, что баланс увеличился на значение bet
    expect(await ethers.provider.getBalance(lottery.address)).to.equal(contractBalance + bet);
  })

  // проверка, что можно поставить не менее 1% от баланса контракта
  it("Making a small bet", async function(){
    // размер ставки меньше 1% от баланса контракта
    const bet = 100;

    // player2 пробует сделать маленькую ставку
    await expect(
      lottery.connect(player2).bet({value: bet})
    ).to.be.revertedWith("The bet is too low");
  })

  // проверка, что выигрыш можно забрать не ранее, чем через час
  it("The hour has not yet passed", async function(){

    // player1 пробует вывести выигрыш, не дождавшись 1 час
    await expect(
      lottery.connect(player1).withdraw()
    ).to.be.revertedWith("The hour hasn't passed yet");
  })

  // Проверяем, что даже через час выигрыш может забрать только победитель
  it("Only the winner can take the winnings", async function(){

    // переводим время на 1 час вперёд
    await ethers.provider.send('evm_increaseTime', [3600]);

    // player2 пробует вывести выигрыш (ставку делал player1)
    await expect(
      lottery.connect(player2).withdraw()
    ).to.be.revertedWith("You are not a winner");
  })

  // проверка, что победитель через час может забрать свой выигрыш
  it("The winner takes the winnings", async function(){
    
    // сохраняем текущий баланс контракта до вывода выигрыша
    const contractBalanceBefore = BigInt(await ethers.provider.getBalance(lottery.address));
    // рассчитываем ожидаемый баланс контракта после вывода выигрыша
    const contractBalanceAfter = (contractBalanceBefore - contractBalanceBefore % 10n) / 10n;
    // рассчитываем ожидаемый выигрыш
    const winningAmount = contractBalanceBefore - contractBalanceAfter;
    
    // сохраняем текущий баланс игрока до вывода выигрыша
    const playerBalanceBefore = BigInt(await ethers.provider.getBalance(player1.address));

    // выводим выигрыш
    const tx = await lottery.withdraw();
    const txResult = await tx.wait();

    // рассчитываем комиссию за выполнение транзакции
    const fee = BigInt(txResult.cumulativeGasUsed * txResult.effectiveGasPrice);
    // рассчитываем ожидаемые баланс игорака после вывода выигрыша
    // баланс до - комиссия за транзакцию + сумма выигрыша
    const playerBalanceAfter = playerBalanceBefore - fee + winningAmount;

    // проверяем изменение баланса контракта
    expect(await ethers.provider.getBalance(lottery.address)).to.equal(contractBalanceAfter);

    // проверяем изменение баланса игрока
    expect(await ethers.provider.getBalance(player1.address)).to.equal(playerBalanceAfter);

  })


  // проверка, что победитель не может забрать выгрышь дважды
  it("Trying to take the winnings twice", async function(){
    
    // пробуем вывести выгрыш второй раз подряд
    await expect(
      lottery.withdraw()
    ).to.be.revertedWith("You've already taken your winnings");
  })
} )
