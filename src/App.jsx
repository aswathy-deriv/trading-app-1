import { Route, Routes, useLocation } from "solid-app-router";
import { Show, createEffect, lazy } from "solid-js";
import {
  activeSymbols,
  banner_message,
  fetchActiveSymbols,
  is_light_theme,
  selected_markets,
  setSelectedMarkets,
  showAccountSwitcher,
  watch_list_ref,
} from "./stores";
import { configureEndpoint, getAppId, getSocketUrl } from "./utils/config";
import { endpoint, init, login_information } from "Stores/base-store";
import { loginUrl } from "Constants/deriv-urls";

import { AccountSwitcher } from "./components";
import BannerComponent from "./components/banner-component";
import NavBar from "./components/nav";
import { Portal } from "solid-js/web";
import classNames from "classnames";
import { getFavourites } from "./utils/map-markets";
import { mapMarket } from "./utils/map-markets";
import monitorNetwork from "Utils/network-status";
import { onCleanup } from "solid-js";
import { onMount } from "solid-js";
import { sendRequest } from "./utils/socket-base";
import styles from "./App.module.scss";
import { banner_category } from "./constants/banner-category";

const Endpoint = lazy(() => import("Routes/endpoint"));
const Dashboard = lazy(() => import("Routes/dashboard/dashboard"));
const Trade = lazy(() => import("Routes/trade/trade"));
const Reports = lazy(() => import("Routes/reports/reports"));

function App() {
  const { network_status } = monitorNetwork();
  const isSandbox = () => /dev$/.test(endpoint().server_url);
  const location = useLocation();
  const pathname = location.pathname;

  onMount(async () => {
    configureEndpoint(getAppId(), getSocketUrl());
    await fetchActiveSymbols();
    const map_market = mapMarket(activeSymbols());
    const getFavs = JSON.parse(localStorage.getItem("favourites"));
    if (getFavs?.length) {
      getFavs.forEach((marketSymbol) =>
        setSelectedMarkets([...selected_markets(), map_market[marketSymbol]])
      );
    }
  });

  createEffect(() => {
    init().then(() => {
      if (pathname.match(/(trade|reports)/) && !login_information.is_logged_in)
        window.location.href = loginUrl({ language: "en" });
      fetchActiveSymbols().then(() => {
        const map_market = mapMarket(activeSymbols());
        const get_favs = getFavourites();
        if (get_favs?.length) {
          get_favs.forEach((marketSymbol) =>
            setSelectedMarkets([
              ...selected_markets(),
              map_market[marketSymbol],
            ])
          );
        }
      });
    });
  });

  onCleanup(() => {
    Object.values(watch_list_ref()).forEach((symbol) =>
      sendRequest({ forget: watch_list_ref()[symbol] })
    );
  });

  return (
    <div
      class={classNames(styles.App, {
        "theme-light": is_light_theme(),
        "theme-dark": !is_light_theme(),
      })}
    >
      <Show when={banner_message()}>
        <BannerComponent
          message={banner_message()}
          category={banner_category.ERROR}
          showCloseButton
        />
      </Show>
      <NavBar />
      <section
        class={classNames(styles.content, {
          [styles["is-acc-switcher-open"]]: showAccountSwitcher(),
        })}
      >
        <Portal>
          {network_status.is_disconnected && (
            <div class={styles.banner}>
              <div class={styles.caret} />
              <div class={styles.disconnected}>You seem to be offline.</div>
            </div>
          )}
        </Portal>
        {showAccountSwitcher() && <AccountSwitcher />}
        <Routes>
          <Route element={<Endpoint />} path="/endpoint" />
          <Route path="/" element={<Dashboard />} />
          <Route path="/trade" element={<Trade />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </section>
      <footer>
        <Show when={isSandbox()} fallback={<div>Connected to Prod</div>}>
          <div>
            The server <a href="/endpoint">endpoint</a> is: &nbsp;
            <span>{endpoint().server_url}</span>
          </div>
        </Show>
      </footer>
    </div>
  );
}

export default App;
