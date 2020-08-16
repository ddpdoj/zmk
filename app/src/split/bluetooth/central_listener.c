#include <logging/log.h>
#include <kernel.h>
LOG_MODULE_DECLARE(zmk, CONFIG_ZMK_LOG_LEVEL);

#include <bluetooth/bluetooth.h>
#include <bluetooth/conn.h>

#include <zmk/event-manager.h>
#include <zmk/events/position-state-changed.h>
#include <zmk/events/sensor-event.h>

bool sleeping = false;

static void sleep_all(struct bt_conn *conn, void *data)
{
  struct bt_conn_info info;

	bt_conn_get_info(conn, &info);

  if (info.role == BT_CONN_ROLE_MASTER)
  {
    int err = bt_conn_le_param_update(conn, BT_LE_CONN_PARAM(0x00C8, 0x00C8, 0, 400));

    if (err)
    {
      LOG_DBG("Failed to sleep split connection: %d", err);
    }
  }
}

static void wake_all(struct bt_conn *conn, void *data)
{
  struct bt_conn_info info;

	bt_conn_get_info(conn, &info);

  if (info.role == BT_CONN_ROLE_MASTER)
  {
    int err = bt_conn_le_param_update(conn, BT_LE_CONN_PARAM(0x0006, 0x0006, 30, 400));

    if (err)
    {
      LOG_DBG("Failed to wake up split connection: %d", err);
    }
  }
}

void set_sleep_params(struct k_work *work)
{
  LOG_DBG("Sleeping!");

  bt_conn_foreach(BT_CONN_TYPE_LE, sleep_all, NULL);

  sleeping = true;
}

K_WORK_DEFINE(sleep_work, set_sleep_params);

void set_sleep_handler(struct k_timer *dummy)
{
  k_work_submit(&sleep_work);
}

void set_wake_params()
{
  LOG_DBG("Waking!");
  bt_conn_foreach(BT_CONN_TYPE_LE, wake_all, NULL);

  sleeping = false;
}

K_TIMER_DEFINE(sleep_timer, set_sleep_handler, NULL);

int central_listener(const struct zmk_event_header *eh)
{
  if (sleeping)
  {
    set_wake_params();
  }

  k_timer_stop(&sleep_timer);
  k_timer_start(&sleep_timer, K_SECONDS(10), K_NO_WAIT);

	return ZMK_EV_EVENT_CAPTURED;
}

ZMK_LISTENER(central, central_listener);
ZMK_SUBSCRIPTION(central, position_state_changed);

#if ZMK_KEYMAP_HAS_SENSORS
ZMK_SUBSCRIPTION(central, sensor_event);
#endif /* ZMK_KEYMAP_HAS_SENSORS */
