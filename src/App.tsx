import { useState, useEffect } from "preact/hooks";
import { invoke } from "@tauri-apps/api/tauri";
import "./custom.css";
import "./pico.css";

interface ChampionTableRow {
  img: string;
  name: string;
  winrate: number;
  mastery: number;
  won: boolean;
  played: boolean;
}

function App() {
  const temp: ChampionTableRow[] = [];
  const [champs, setChamps] = useState(temp);

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

  return (
    <div class="container">
      <table class="striped">
        <thead>
          <tr>
            <th>Icon</th>
            <th>Champion</th>
            <th>Winrate</th>
            <th>Mastery</th>
            <th>Won</th>
            <th>Played</th>
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
