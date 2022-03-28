// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0;

contract Lottery{

    // адрес игрока сделавшего последнюю ставку
    address lastPlayer;
    // время когда была сделана последняя ставка
    uint timeOfLastBid;
    // эта переменная нужна, чтобы один и тот же человек не смог вытащить весь банк
    // за несколько вызовов функции withdraw()
    // true - победитель забрал выигрыш
    // false - победитель не забрал выигрыш
    bool winnerGetEth;

    event MakeBet(address indexed player, uint indexed amount);
    event WithDraw(address indexed winner, uint indexed amount);

    constructor(){
        winnerGetEth = false;
    }

    // функция для внесения ставки
    function bet()external payable{
        // проверяем, что размер ставки не менее 1% от общей ставки
        require(msg.value >= address(this).balance / 100, "The bet is too low");
        // сохраняем адрес игрока сделавшего последнюю ставку
        lastPlayer = msg.sender;
        // сохраняем время последней ставки
        timeOfLastBid = block.timestamp;
        // новая ставка - новая игра
        // полученный ранее выигрыш был за предыдущую игру
        if(winnerGetEth == true){
            winnerGetEth = false;
        }
        // записыаем событие
        emit MakeBet(msg.sender, msg.value);
    }

    // функция для вывода выигрыша
    function withdraw()external{
        // проверка,
        // что с последней ставки прошло больше часа
        require(timeOfLastBid + 1 hours < block.timestamp, "The hour hasn't passed yet");
        // что деньги хочет вывести победитель
        require(msg.sender == lastPlayer, "You are not a winner");
        // и победитель ещё не забрал свой выигрыш
        require(winnerGetEth == false, "You've already taken your winnings");
        // рассчитываем выигрыш
        uint winning = address(this).balance - address(this).balance / 10;
        // отправка на адрес победителя его выигрыша - 90% баланса контракта
        payable(lastPlayer).transfer(winning);
        // запоминаем, что выигрыш выдан победителю
        winnerGetEth = true;
        // записыаем событие
        emit WithDraw(lastPlayer, winning);
    }
}

// deployed 0x84Ed70b6dE7Db6FfAe664c008ad8d3271AfaaFC4