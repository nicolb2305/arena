import { useState, useEffect } from "preact/hooks";
import { invoke } from "@tauri-apps/api/tauri";
import "./custom.css";
import "./pico.css";

interface ChampionTableRow {
  img: string;
  name: string;
  winrate: number;
  mastery: number;
  mastery_win: number;
  won: boolean;
  played: boolean;
}

function App() {
  const temp: ChampionTableRow[] = [];
  const [champs, setChamps] = useState(temp);
  const [sort_dir, setSortDir] = useState(-1);
  const [sort_col, setSortCol] = useState("mastery_win");

  async function champion(): Promise<ChampionTableRow[]> {
    return invoke("get_all_data");
  }

  useEffect(() => {
    champion().then((champs) => setChamps(champs));
  }, []);

  const numberPercentageFormatter = Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  const numberFormatter = Intl.NumberFormat();

  const sort = (attr: keyof ChampionTableRow) => () => {
    let sort_dir_temp = sort_dir;
    if (attr === sort_col) {
      sort_dir_temp = -sort_dir_temp;
    } else {
      sort_dir_temp = -1;
      setSortCol(attr);
    }
    setChamps(
      champs.slice(0).sort((a, b) => {
        let cmp;
        if (typeof a[attr] === "string") {
          cmp = a[attr] > b[attr];
        } else {
          cmp = a[attr] < b[attr];
        }
        return cmp ? -sort_dir_temp : sort_dir_temp;
      })
    );
    setSortDir(sort_dir_temp);
  };

  return (
    <div class="container">
      <table class="striped">
        <thead>
          <tr>
            <th>Icon</th>
            <th onClick={sort("name")}>Champion</th>
            <th onClick={sort("winrate")}>Winrate</th>
            <th onClick={sort("mastery")}>Mastery</th>
            <th onClick={sort("mastery_win")}>Metric</th>
            <th onClick={sort("won")}>Won</th>
            <th onClick={sort("played")}>Played</th>
          </tr>
        </thead>
        <tbody>
          {champs.map((champ) => {
            return (
              <tr>
                <td>
                  <img src={champ.img} width="50" />
                </td>
                <td>{champ.name}</td>
                <td class="number">
                  {numberPercentageFormatter.format(champ.winrate / 100)}
                </td>
                <td class="number">{numberFormatter.format(champ.mastery)}</td>
                <td class="number">
                  {numberFormatter.format(champ.mastery_win)}
                </td>
                <td class="center">
                  <input type="checkbox" checked={champ.won} disabled />
                </td>
                <td class="center">
                  <input type="checkbox" checked={champ.played} disabled />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
