// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(clippy::used_underscore_binding)]

use std::collections::HashMap;

use client_api::{
    client::Client,
    ddragon::endpoints::{champion, versions},
};
use serde::{Deserialize, Serialize};
use tauri::State;

const CHAMPION_OCEAN: &str = "602001";
const ADAPT_TO_ALL_SITUATIONS: &str = "602002";

#[derive(Debug, Serialize, Deserialize)]
struct ChampionWinrate {
    name: String,
    win: f32,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChampionTableRow {
    img: String,
    name: String,
    winrate: f32,
    mastery: i32,
    won: bool,
    played: bool,
}

#[tauri::command]
async fn get_all_data(client: State<'_, Client>) -> Result<Vec<ChampionTableRow>, &'static str> {
    let mastery: HashMap<_, _> = (*client)
        .get_lol_champion_mastery_v1_local_player_champion_mastery()
        .await
        .map_err(|_| "Failed to fetch champion mastery")?
        .into_iter()
        .map(|champ| (champ.champion_id, champ.champion_points))
        .collect();

    let challenges = ((*client)
        .get_lol_challenges_v1_challenges_local_player()
        .await)
        .map_err(|_| "Failed to fetch challenges")?;

    #[allow(clippy::string_lit_as_bytes)]
    let winrates: HashMap<_, _> =
        csv::Reader::from_reader(include_str!(r"..\python\out.csv").as_bytes())
            .deserialize()
            .filter_map(Result::ok)
            .map(|ChampionWinrate { name, win }| (name, win))
            .collect();

    let version = versions()
        .await
        .map_err(|_| "Failed to fetch versions")?
        .first()
        .ok_or("No versions found")?
        .clone();

    let champions = champion(&version)
        .await
        .map_err(|_| "Failed to fetch champion data")?
        .data;

    Ok(champions
        .into_iter()
        .flat_map(|(_, champ)| {
            Some(ChampionTableRow {
                img: format!(
                    "https://cdn.communitydragon.org/latest/champion/{}/square",
                    champ.key
                ),
                winrate: *winrates.get(&champ.name)?,
                name: champ.name,
                mastery: *mastery.get(&champ.key.parse::<i32>().unwrap())?,
                won: challenges
                    .get(ADAPT_TO_ALL_SITUATIONS)?
                    .completed_ids
                    .contains(&champ.key.parse::<i32>().unwrap()),
                played: challenges
                    .get(CHAMPION_OCEAN)?
                    .completed_ids
                    .contains(&champ.key.parse::<i32>().unwrap()),
            })
        })
        .collect())
}

fn main() -> anyhow::Result<()> {
    let client = Client::new()?;
    tauri::Builder::default()
        .manage(client)
        .invoke_handler(tauri::generate_handler![get_all_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    Ok(())
}
