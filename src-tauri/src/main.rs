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
    id: i32,
    img: String,
    name: String,
    winrate: f32,
    mastery: i32,
    won: bool,
    played: bool,
}

#[tauri::command]
async fn randomize_teams(client: State<'_, Client>) -> Result<(), String> {
    client_api::actions::randomize_teams(&client)
        .await
        .map_err(|x| x.to_string())
}

#[tauri::command]
async fn select_champion(client: State<'_, Client>, champion_id: i32) -> Result<(), String> {
    client_api::actions::select_champion(&client, champion_id)
        .await
        .map_err(|x| x.to_string())
}

#[tauri::command]
async fn get_all_data(client: State<'_, Client>) -> Result<Vec<ChampionTableRow>, &'static str> {
    println!("Fetching all champions");
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
        .filter_map(|(_, champ)| {
            let winrate = *winrates.get(&champ.name)?;
            let key = champ.key.parse::<i32>().unwrap();
            let mastery = *mastery.get(&key)?;
            Some(ChampionTableRow {
                id: key,
                img: format!(
                    "https://cdn.communitydragon.org/latest/champion/{}/square",
                    champ.key
                ),
                winrate,
                name: champ.name,
                mastery,
                won: challenges
                    .get(ADAPT_TO_ALL_SITUATIONS)?
                    .completed_ids
                    .contains(&key),
                played: challenges.get(CHAMPION_OCEAN)?.completed_ids.contains(&key),
            })
        })
        .collect())
}

fn main() -> anyhow::Result<()> {
    let client = Client::new()?;
    tauri::Builder::default()
        .manage(client)
        .invoke_handler(tauri::generate_handler![
            get_all_data,
            select_champion,
            randomize_teams
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    Ok(())
}
