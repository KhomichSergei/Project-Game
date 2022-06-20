import {Records} from './records.js'
import {start, confirmGoBack, isPlaying, stopGame} from "./ship.js";

function setRecordsToTable(records) {
    var recordsList = document.getElementById('recordsList');
    recordsList.innerHTML = "";
    records.forEach(function (record, index) {
        var recordListItem = document.createElement('li');
        recordListItem.innerHTML = `<span>${index + 1}</span><span>${record[0]}</span><span>${record[1]}</span>`
        recordsList.append(recordListItem);
    })
}

export function SwitchToStateFromURLHash() {
    console.log('Закладка изменилась: ');
    var URLHash = window.location.hash;


    function changeRepresentation(state) {
        var stateElements = [
                {state: 'Menu', 'id': 'menu'},
                {state: 'Start', 'id': 'start'},
                {state: 'Records', 'id': 'records'},
            ];

        stateElements.forEach(function(entry) {
            var showElement = entry.state === state;
            document.getElementById(entry.id).style.display = showElement ? 'block' : 'none';
        });
    }

    var state = decodeURIComponent(URLHash.substr(1));

    switch (state) {
        case 'Menu':
            if (isPlaying()) {
                if (confirmGoBack()){
                    stopGame();
                    changeRepresentation(state);
                    break;
                }
                history.replaceState({}, "", "#Start");
            } else {
                changeRepresentation(state);
            }
            break;
        case 'Start':
            changeRepresentation(state);
            start();
            break;
        case 'Records':
            changeRepresentation(state);
            Records.getRecords().then(
                (records) => {
                    console.log(records);
                    setRecordsToTable(records);
                }
            );

            break;

        default:
            window.location.hash = '#Menu';
            break;
    }
}

window.onbeforeunload = beforeUnload;
var reloadMsg = 'В случае перезагрузки страницы прогресс игры будет утрачен';
function beforeUnload(e) {
    e=e || window.event;
    if (isPlaying()) {
        e.returnValue = reloadMsg;
        return reloadMsg;
    }
}
