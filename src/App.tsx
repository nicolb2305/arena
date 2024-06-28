import { useState, useEffect } from "preact/hooks";
import { invoke } from "@tauri-apps/api/tauri";
import "./custom.css";
import "@picocss/pico/css/pico.css";

interface ChampionTableRow {
  id: number;
  img: string;
  name: string;
  winrate: number;
  mastery: number;
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
const integerFormatter = Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

function DisplaySelector(props: {
  column: number;
  text: string;
  callback: (target: Display) => void;
}) {
  return (
    <div style={`grid-column-start: ${props.column}; grid-row-start: 3;`}>
      <p>{props.text}</p>
      <select
        onChange={(event) => {
          props.callback((event.target! as HTMLSelectElement).value as Display);
        }}
      >
        <option value="both">Both</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  );
}

async function randomizeTeams() {
  invoke("randomize_teams");
}

function App() {
  const temp: ChampionTableRow[] = [];
  const [champs, setChamps] = useState(temp);
  const [sortDir, setSortDir] = useState(-1);
  const [sortCol, setSortCol] = useState("masteryWin");
  const [displayPlayed, setPlayed] = useState(Display.Both);
  const [displayWon, setWon] = useState(Display.Both);
  const [search, setSearch] = useState("");
  const [lastPicked, setLastPicked] = useState(-1);
  const [winrateWeight, setWinrateWeight] = useState(25);
  const [refreshCounter, setRefreshCounter] = useState(0);

  async function selectChampion(championId: number) {
    setLastPicked(championId);
    invoke("select_champion", { championId: championId });
  }

  async function champion(): Promise<ChampionTableRow[]> {
    const champs: ChampionTableRow[] = await invoke("get_all_data");
    champs.sort((a, b) => masteryWin(b) - masteryWin(a));
    return champs;
  }

  // Only fetch champions on first render
  useEffect(() => {
    champion().then((champs) => setChamps(champs));
  }, [refreshCounter]);

  // If winrateWeight is changed, re-sort by metric if already sorted by metric
  useEffect(() => {
    if (sortCol === "masteryWin") {
      champSortMetric(false)();
    }
  }, [winrateWeight]);

  const champSort = (attr: keyof ChampionTableRow) => () => {
    let sortDirTemp = sortDir;
    if (attr === sortCol) {
      sortDirTemp = -sortDirTemp;
    } else {
      sortDirTemp = -1;
    }
    setChamps(
      champs.slice(0).sort((a, b) => {
        let cmp;
        if (typeof a[attr] === "string") {
          cmp = a[attr] > b[attr];
        } else {
          cmp = a[attr] < b[attr];
        }
        return cmp ? -sortDirTemp : sortDirTemp;
      })
    );
    setSortDir(sortDirTemp);
    setSortCol(attr);
  };

  const champSortMetric = (reverse: boolean) => () => {
    const attr = "masteryWin";
    let sortDirTemp = sortDir;
    if (attr === sortCol && reverse) {
      sortDirTemp = -sortDirTemp;
    } else if (attr !== sortCol) {
      sortDirTemp = -1;
    }
    setChamps(
      champs
        .slice(0)
        .sort((a, b) =>
          masteryWin(a) < masteryWin(b) ? -sortDirTemp : sortDirTemp
        )
    );
    setSortDir(sortDirTemp);
    setSortCol(attr);
  };

  const champFilter = (champ: ChampionTableRow) => {
    if (search === "") {
      return (
        display(displayPlayed, "played")(champ) &&
        display(displayWon, "won")(champ)
      );
    } else {
      return search
        .split("|")
        .some((search_part) => champ.name.toLowerCase().includes(search_part));
    }
  };

  const masteryWin = (champ: ChampionTableRow) =>
    (champ.winrate - winrateWeight) * Math.log2(champ.mastery);

  const championRowCreator = (champ: ChampionTableRow) => {
    return (
      <tr
        onClick={(event) => {
          selectChampion(Number(event.currentTarget.dataset.championid));
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
        <td class="number">{integerFormatter.format(champ.mastery)}</td>
        <td class="number">{integerFormatter.format(masteryWin(champ))}</td>
        <td class="center">
          <input type="checkbox" checked={champ.won} disabled />
        </td>
        <td class="center">
          <input type="checkbox" checked={champ.played} disabled />
        </td>
      </tr>
    );
  };

  const selectRandomChampion = () => {
    const availableChamps = champs
      .filter(champFilter)
      .filter((champ) => champ.id != lastPicked);
    if (availableChamps.length === 0) {
      return;
    }
    selectChampion(
      availableChamps[Math.floor(Math.random() * availableChamps.length)].id
    );
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
        <div style="grid-column-start: 1; grid-column-end: 3; grid-row-start: 2;">
          <p>Winrate weighting</p>
          <input
            type="range"
            min="0"
            max="60"
            defaultValue="25"
            step="5"
            onChange={(event) =>
              setWinrateWeight(
                parseInt((event.target! as HTMLInputElement).value)
              )
            }
          />
        </div>
        <DisplaySelector column={1} text="Show played" callback={setPlayed} />
        <DisplaySelector column={2} text="Show won" callback={setWon} />
        <input
          type="text"
          style="grid-column-start: 1; grid-column-end: 3; grid-row-start: 4"
          placeholder="Search"
          onInput={(event) =>
            setSearch((event.target! as HTMLTextAreaElement).value)
          }
        ></input>
        <button
          onClick={selectRandomChampion}
          style="grid-column-start: 1; grid-row-start: 5;"
        >
          Pick random
        </button>
        <button
          onClick={() => setRefreshCounter(refreshCounter + 1)}
          style="grid-column-start: 2; grid-row-start: 5;"
        >
          Refresh
        </button>
      </div>
      <table class="striped">
        <thead>
          <tr>
            <th id="img">Icon</th>
            <th id="name" onClick={champSort("name")}>
              Champion
            </th>
            <th id="winrate" onClick={champSort("winrate")}>
              Winrate
            </th>
            <th id="mastery" onClick={champSort("mastery")}>
              Mastery
            </th>
            <th id="metric" onClick={champSortMetric(true)}>
              Metric
            </th>
            <th id="won" onClick={champSort("won")}>
              Won
            </th>
            <th id="played" onClick={champSort("played")}>
              Played
            </th>
          </tr>
        </thead>
        <tbody>{champs.filter(champFilter).map(championRowCreator)}</tbody>
      </table>
    </div>
  );
}

export default App;
