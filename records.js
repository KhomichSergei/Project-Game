export class Records {
    static REQUEST_URL='https://deep-space-65db1-default-rtdb.europe-west1.firebasedatabase.app/records.json';
    static RECORDS_LENGTH = 10;

    static async getRecords() {
        const response = await fetch(this.REQUEST_URL);
        const records = await response.json();
        const recordsArray = Object.entries(records);
        return this.sortRecords(recordsArray).splice(0, this.RECORDS_LENGTH);
    }

    static async saveRecord(name, score) {
        //Загружаем рекорды из базы
        const records = await this.getRecords();
        const sortedArray = this.sortRecords(records);
        // Проверяем есть ли юзер в таблице
        // Если имени нет в таблице рекордов или есть но счет меньше текущего
        if(!records[name] || records[name] < score) {
            if (this.isReadyToSave(sortedArray, score, this.RECORDS_LENGTH)){
                await fetch(this.REQUEST_URL, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({[name]: score})
                })
            }

        }
    }

    static setLoadingRecords(isLoading) {
        document.getElementById('loader').style.display = isLoading ? "block" : "none";
    }

    static isReadyToSave = function (sortedRecords, score, recordsLength) {
        // Если в таблице 10 или больше записей
        console.log(sortedRecords);
        if (sortedRecords.length >= recordsLength) {
            return sortedRecords[recordsLength - 1][1] < score;
        }
        return true;
    }

    static sortRecords = function (recordsArray) {
        return recordsArray.sort(function (a, b) {
            return b[1] - a[1];
        });
    }
};

