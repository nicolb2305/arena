import { useState, useEffect } from "preact/hooks";
import { invoke } from "@tauri-apps/api/tauri";
import "./custom.css";
import "./pico.css";

interface ChampionTableRow {
  id: number;
  img: string;
  name: string;
  winrate: number;
  mastery: number;
  mastery_win: number;
  won: boolean;
  played: boolean;
}

enum Display {
  Yes = "yes",
  No = "no",
  Both = "both",
}

const numberPercentageFormatter = Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});
const numberFormatter = Intl.NumberFormat();

function App() {
  const temp: ChampionTableRow[] = [];
  const [champs, setChamps] = useState(temp);
  const [sortDir, setSortDir] = useState(-1);
  const [sortCol, setSortCol] = useState("mastery_win");
  const [displayPlayed, setPlayed] = useState(Display.Both);
  const [displayWon, setWon] = useState(Display.Both);
  const [search, setSearch] = useState("");

  async function champion(): Promise<ChampionTableRow[]> {
    return invoke("get_all_data");
  }

  async function selectChampion(championId: number) {
    invoke("select_champion", { championId: championId });
  }

  async function randomizeTeams() {
    invoke("randomize_teams");
  }

  useEffect(() => {
    champion().then((champs) => setChamps(champs));
  }, []);

  const sort = (attr: keyof ChampionTableRow) => () => {
    let sort_dir_temp = sortDir;
    if (attr === sortCol) {
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

  const display =
    (displayValue: Display, attr: keyof ChampionTableRow) =>
    (champ: ChampionTableRow) => {
      switch (displayValue) {
        case Display.Both: {
          return true;
        }
        case Display.Yes: {
          return champ[attr];
        }
        case Display.No: {
          return !champ[attr];
        }
      }
    };

  return (
    <div class="container">
      <div class="columns">
        <button
          onClick={randomizeTeams}
          style="grid-column-start: 1; grid-column-end: 3; grid-row-start: 1;"
        >
          Randomize teams
        </button>
        <div style="grid-column-start: 1; grid-row-start: 2;">
          <p>Show played</p>
          <select onChange={(event) => setPlayed(event.target.value)}>
            <option value="both">Both</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div style="grid-column-start: 2; grid-row-start: 2;">
          <p>Show won</p>
          <select
            style="grid-column-start: 2"
            onChange={(event) => setWon(event.target.value)}
          >
            <option value="both">Both</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <input
          type="text"
          style="grid-column-start: 1; grid-column-end: 3; grid-row-start: 3"
          placeholder="Search"
          onInput={(event) => setSearch(event.target.value)}
        ></input>
      </div>
      <table class="striped">
        <thead>
          <tr>
            <th id="img">Icon</th>
            <th id="name" onClick={sort("name")}>
              Champion
            </th>
            <th id="winrate" onClick={sort("winrate")}>
              Winrate
            </th>
            <th id="mastery" onClick={sort("mastery")}>
              Mastery
            </th>
            <th id="metric" onClick={sort("mastery_win")}>
              Metric
            </th>
            <th id="won" onClick={sort("won")}>
              Won
            </th>
            <th id="played" onClick={sort("played")}>
              Played
            </th>
          </tr>
        </thead>
        <tbody>
          {champs
            .filter((champ) => {
              if (search === "") {
                return (
                  display(displayPlayed, "played")(champ) &&
                  display(displayWon, "won")(champ)
                );
              } else {
                return search
                  .split("|")
                  .some((search_part) =>
                    champ.name.toLowerCase().includes(search_part)
                  );
              }
            })
            .map((champ) => {
              return (
                <tr
                  onClick={(event) => {
                    selectChampion(
                      Number(event.currentTarget.dataset.championid)
                    );
                  }}
                  data-championid={champ.id}
                >
                  <td>
                    <img src={champ.img} width="50" />
                  </td>
                  <td>{champ.name}</td>
                  <td class="number">
                    {numberPercentageFormatter.format(champ.winrate / 100)}
                  </td>
                  <td class="number">
                    {numberFormatter.format(champ.mastery)}
                  </td>
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
