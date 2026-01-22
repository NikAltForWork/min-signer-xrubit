import axios from "axios";
import config from "../../Core/config/config";
import NotificationService from "../Notification/NotificationService";

interface RentResourceResponse {
	id: string;
	address: string;
	amount: number;
	resource: string;
	duration: string;
	txn_hash: string;
	status: string;
	error: string | null;
	expiration_at: string;
	create_at: string;
	cost: number;
}

export default class ReFeeService {
	private key: string;
	private base_url: string;
	private proceed_on_failure: number;
	private notifyService: NotificationService;

	constructor() {
		this.key = config.tron.re_fee_api_key;
		this.base_url = config.tron.re_fee_base_url;
		this.proceed_on_failure = Number.parseInt(
			config.tron.should_proceed_on_re_fee_failure,
			10,
		);
		this.notifyService = new NotificationService();
	}

	public async calculateEnergy(address: string): Promise<number> {
		try {
			const response = await axios.get(
				`${this.base_url}/api/functions/cost/${address}`,
				{
					headers: {
						"X-API-KEY": this.key,
						Accept: "application/json",
					},
				},
			);

			return Number.parseFloat(response.data.cost);
		} catch (error: any) {
			if (this.proceed_on_failure === 0) {
				throw new Error(`Failed to calculate energy price ${error.message}`);
			} else {
				this.notifyService.notifyLog({
					type: "tron - Re:Fee",
					level: "error",
					message: `Error in Re:Fee energy cost calculation - ${error.message}`,
					id: "undefined",
				});
				return 0;
			}
		}
	}

	public async rentResource(
		address: string,
		amount: number,
		resource: string,
		duration: string,
	): Promise<RentResourceResponse | false> {
		try {
			const body = {
				address: address,
				amount: amount,
				resource: resource,
				duration_label: duration,
			};

			const response = await axios.post(
				`${this.base_url}/api/rent_resource/orders`,
				body,
				{
					headers: {
						"X-API-KEY": this.key,
						"Content-Type": "application/json",
						Accept: "application/json",
					},
				},
			);

			return response.data;
		} catch (error: any) {
			if (this.proceed_on_failure === 0) {
				throw new Error(`Failed to rent ${resource} ${error.message}`);
			} else {
				this.notifyService.notifyLog({
					type: "tron - Re:Fee",
					level: "error",
					message: `Failed to rent ${resource} from Re:Fee - ${error.message}`,
					id: "undefined",
				});
				return false;
			}
		}
	}
}
