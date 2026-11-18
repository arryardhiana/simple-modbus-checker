import unittest
from unittest.mock import MagicMock, patch

from main import ConnectionConfig
from modbus_client import ModbusManager
from pymodbus.framer import FramerType
import store


class TestConnectionConfig(unittest.TestCase):
    def test_serial_config_defaults(self):
        cfg = ConnectionConfig(
            port="/dev/ttyUSB0",
            baudrate=9600,
            parity="N",
            stopbits=1,
            bytesize=8,
            timeout=1.0,
            slave_id=1,
        )
        self.assertEqual(cfg.conn_type, "serial")
        self.assertEqual(cfg.port, "/dev/ttyUSB0")

    def test_tcp_config_valid(self):
        cfg = ConnectionConfig(
            conn_type="tcp",
            host="192.168.1.100",
            tcp_port=502,
            framing="tcp",
            timeout=1.0,
            slave_id=2,
        )
        self.assertEqual(cfg.conn_type, "tcp")
        self.assertEqual(cfg.host, "192.168.1.100")
        self.assertEqual(cfg.tcp_port, 502)
        self.assertEqual(cfg.framing, "tcp")
        self.assertEqual(cfg.slave_id, 2)

    def test_tcp_rtu_over_tcp_config(self):
        cfg = ConnectionConfig(
            conn_type="tcp",
            host="192.168.1.50",
            tcp_port=4001,
            framing="rtu",
            timeout=2.0,
            slave_id=5,
        )
        self.assertEqual(cfg.framing, "rtu")
        self.assertEqual(cfg.tcp_port, 4001)


class TestStoreDefaults(unittest.TestCase):
    def test_default_config_has_tcp_fields(self):
        self.assertIn("conn_type", store.DEFAULT_CONFIG["connection"])
        self.assertIn("host", store.DEFAULT_CONFIG["connection"])
        self.assertIn("tcp_port", store.DEFAULT_CONFIG["connection"])
        self.assertIn("framing", store.DEFAULT_CONFIG["connection"])


class TestModbusManagerTCP(unittest.TestCase):
    @patch("modbus_client.ModbusTcpClient")
    def test_connect_tcp_socket_framing(self, mock_tcp_cls):
        mock_client = MagicMock()
        mock_client.connect.return_value = True
        mock_tcp_cls.return_value = mock_client

        mgr = ModbusManager()
        ok, msg = mgr.connect({
            "conn_type": "tcp",
            "host": "192.168.1.100",
            "tcp_port": 502,
            "framing": "tcp",
            "timeout": 1.5,
            "slave_id": 3,
        })
        self.assertTrue(ok)
        self.assertTrue(mgr.connected)
        mock_tcp_cls.assert_called_once_with(
            host="192.168.1.100",
            port=502,
            framer=FramerType.SOCKET,
            timeout=1.5,
        )
        self.assertEqual(mgr.slave_id, 3)

    @patch("modbus_client.ModbusTcpClient")
    def test_connect_tcp_rtu_framing(self, mock_tcp_cls):
        mock_client = MagicMock()
        mock_client.connect.return_value = True
        mock_tcp_cls.return_value = mock_client

        mgr = ModbusManager()
        ok, msg = mgr.connect({
            "conn_type": "tcp",
            "host": "192.168.1.50",
            "tcp_port": 4001,
            "framing": "rtu",
            "timeout": 2.0,
            "slave_id": 10,
        })
        self.assertTrue(ok)
        mock_tcp_cls.assert_called_once_with(
            host="192.168.1.50",
            port=4001,
            framer=FramerType.RTU,
            timeout=2.0,
        )
        self.assertEqual(mgr.slave_id, 10)


class TestModbusTCPIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import asyncio
        import threading
        import time
        from pymodbus.datastore import ModbusSequentialDataBlock, ModbusServerContext, ModbusSlaveContext
        from pymodbus.server import StartAsyncTcpServer

        cls.port = 50209
        datablock = ModbusSlaveContext(
            di=ModbusSequentialDataBlock(0, [1, 0, 1]),
            co=ModbusSequentialDataBlock(0, [0, 1, 0]),
            hr=ModbusSequentialDataBlock(0, [100, 200, 300]),
            ir=ModbusSequentialDataBlock(0, [111, 222, 333]),
            zero_mode=True,
        )
        context = ModbusServerContext(slaves=datablock, single=True)

        async def run_server():
            await StartAsyncTcpServer(context=context, address=("127.0.0.1", cls.port))

        cls.server_thread = threading.Thread(target=lambda: asyncio.run(run_server()), daemon=True)
        cls.server_thread.start()
        time.sleep(0.5)

    def test_live_tcp_read_and_write(self):
        mgr = ModbusManager()
        ok, msg = mgr.connect({
            "conn_type": "tcp",
            "host": "127.0.0.1",
            "tcp_port": self.port,
            "framing": "tcp",
            "timeout": 1.0,
            "slave_id": 1,
        })
        self.assertTrue(ok)
        self.assertTrue(mgr.connected)

        # Read holding register with scale and offset
        val = mgr.read_register({
            "id": "hr1",
            "name": "hr1",
            "type": "holding",
            "address": 1,
            "data_type": "uint16",
            "scale": 0.5,
            "offset": 10.0,
        })
        # 200 * 0.5 + 10 = 110.0
        self.assertEqual(val, 110.0)

        # Write holding register
        mgr.write_register({
            "type": "holding",
            "address": 0,
            "data_type": "uint16",
            "scale": 1.0,
            "offset": 0.0,
        }, 555)

        val_after = mgr.read_register({
            "id": "hr0",
            "name": "hr0",
            "type": "holding",
            "address": 0,
            "data_type": "uint16",
            "scale": 1.0,
            "offset": 0.0,
        })
        self.assertEqual(val_after, 555.0)

        # Read coil
        coil_val = mgr.read_register({
            "id": "c1",
            "name": "c1",
            "type": "coil",
            "address": 1,
        })
        self.assertTrue(coil_val)

        mgr.disconnect()
        self.assertFalse(mgr.connected)


if __name__ == "__main__":
    unittest.main()

